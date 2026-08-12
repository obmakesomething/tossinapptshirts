/**
 * Order persistence.
 *
 * Orders used to exist only as an outbound email, which left two holes: a
 * customer could not see their own history, and a withdrawal request could not
 * erase their personal data because there was nothing addressable to erase.
 * This module is the storage side of closing both.
 */

const { getPool } = require('./db');

const ORDER_STATUS = {
  RECEIVED: 'received',
  PRODUCING: 'producing',
  SHIPPED: 'shipped',
  DELIVERED: 'delivered',
};

const STATUS_LABEL = {
  received: '주문 접수',
  producing: '제작 중',
  shipped: '배송 중',
  delivered: '배송 완료',
};

/** Order the timeline follows; also used to mark earlier steps complete. */
const STATUS_SEQUENCE = [
  ORDER_STATUS.RECEIVED,
  ORDER_STATUS.PRODUCING,
  ORDER_STATUS.SHIPPED,
  ORDER_STATUS.DELIVERED,
];

/**
 * Pricing arrives from the client pre-formatted for display ("₩24,000", "무료"),
 * so digits have to be recovered before the amount can be stored as an integer.
 */
function toAmount(value) {
  if (typeof value === 'number' && Number.isFinite(value)) return Math.round(value);
  const digits = String(value ?? '').replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

function joinAddress(shipping = {}) {
  return [shipping.address1, shipping.address2].filter(Boolean).join(' ').trim();
}

/** "M 1개 · L 2개" — the summary line both order screens display. */
function summarizeLines(items = []) {
  return items
    .filter((item) => item && item.size)
    .map((item) => `${item.size} ${item.quantity || 1}개`)
    .join(' · ');
}

function resolvePrintSides(items = []) {
  const hasBack = items.some((item) => String(item?.print?.placement || '').includes('back'));
  return hasBack ? '앞면 + 뒷면' : '앞면';
}

/**
 * The composition the press file is built from.
 *
 * Position, size and rotation are the customer's own edits, expressed against
 * the printable region. They are stored with the order so the print file can
 * be rebuilt exactly — for a reprint, a claim, or a change of printer.
 */
function buildDesignSpec(order) {
  const pipeline = order.pipeline || {};
  return {
    master_png_url: pipeline.masterPngUrl || null,
    placement: pipeline.placement || 'front',
    print_area_cm: pipeline.printAreaCm || null,
    target_width_px: pipeline.targetWidthPx || null,
    target_height_px: pipeline.targetHeightPx || null,
    print_option_id: pipeline.printOptionId || null,
    print_option_scale: pipeline.printOptionScale ?? null,
    image_transform: pipeline.imageTransform || null,
    text_layer: pipeline.textLayer || null,
    text_transform: pipeline.textTransform || null,
  };
}

/**
 * Persist a submitted order.
 *
 * Upserts on order_id so a client retry of the same order does not duplicate.
 * Returns null when the database is not configured — the caller treats storage
 * as best-effort so a DB outage cannot block a paid order from being fulfilled
 * by email.
 */
async function saveOrder({ order, userId }) {
  const pool = getPool();
  if (!pool) return null;

  const items = Array.isArray(order.items) ? order.items : [];
  const first = items[0] || {};
  const shipping = order.shipping || {};
  const customer = order.customer || {};

  const result = await pool.query(
    `INSERT INTO orders (
       order_id, user_id, status, product_name, color, lines, print_sides,
       total_amount, quantity, recipient, phone, email, address, memo,
       items, pricing, design, created_at, updated_at
     ) VALUES (
       $1, $2, $3, $4, $5, $6, $7,
       $8, $9, $10, $11, $12, $13, $14,
       $15, $16, $17, NOW(), NOW()
     )
     ON CONFLICT (order_id) DO UPDATE SET
       user_id = COALESCE(EXCLUDED.user_id, orders.user_id),
       product_name = EXCLUDED.product_name,
       color = EXCLUDED.color,
       lines = EXCLUDED.lines,
       print_sides = EXCLUDED.print_sides,
       total_amount = EXCLUDED.total_amount,
       quantity = EXCLUDED.quantity,
       recipient = EXCLUDED.recipient,
       phone = EXCLUDED.phone,
       email = EXCLUDED.email,
       address = EXCLUDED.address,
       memo = EXCLUDED.memo,
       items = EXCLUDED.items,
       pricing = EXCLUDED.pricing,
       design = EXCLUDED.design,
       updated_at = NOW()
     RETURNING order_id, created_at`,
    [
      order.orderId,
      userId || null,
      ORDER_STATUS.RECEIVED,
      first.productName || null,
      first.color || null,
      summarizeLines(items),
      resolvePrintSides(items),
      toAmount(order.pricing?.total),
      Number(order.pricing?.quantity) || 0,
      shipping.name || customer.name || null,
      shipping.phone || customer.phone || null,
      customer.email || null,
      joinAddress(shipping) || null,
      shipping.memo || null,
      JSON.stringify(items),
      JSON.stringify(order.pricing || {}),
      // The layout the customer approved. Without it a reprint would have to
      // guess where the design went, and the press file could not be rebuilt.
      JSON.stringify(buildDesignSpec(order)),
    ],
  );

  return result.rows[0] || null;
}

/** Shape consumed by the /orders list screen. */
function toSummary(row) {
  return {
    id: row.order_id,
    orderNumber: row.order_id,
    productName: row.product_name || '',
    color: row.color || '',
    lines: row.lines || '',
    total: row.total_amount || 0,
    status: row.status,
    statusLabel: STATUS_LABEL[row.status] || row.status,
    expectedDate: row.expected_date || undefined,
  };
}

function buildTimeline(row) {
  const currentIndex = STATUS_SEQUENCE.indexOf(row.status);
  return STATUS_SEQUENCE.map((status, index) => ({
    label: STATUS_LABEL[status],
    date: index === 0 ? formatDate(row.created_at) : undefined,
    completed: currentIndex >= 0 && index <= currentIndex,
  }));
}

function formatDate(value) {
  if (!value) return undefined;
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return undefined;
  return date.toISOString().slice(0, 10);
}

/** Shape consumed by the /order-detail screen. */
function toDetail(row) {
  return {
    orderNumber: row.order_id,
    orderDate: formatDate(row.created_at) || '',
    productName: row.product_name || '',
    color: row.color || '',
    lines: row.lines || '',
    printSides: row.print_sides || '앞면',
    total: row.total_amount || 0,
    recipient: row.recipient || '',
    address: row.address || '',
    phone: row.phone || '',
    memo: row.memo || undefined,
    trackingCarrier: row.tracking_carrier || undefined,
    trackingNumber: row.tracking_number || undefined,
    timeline: buildTimeline(row),
  };
}

async function listOrdersByUser(userId, { limit = 50 } = {}) {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `SELECT order_id, status, product_name, color, lines, total_amount, created_at
       FROM orders
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT $2`,
    [userId, limit],
  );
  return result.rows.map(toSummary);
}

/**
 * Fetch one order.
 *
 * userId is required and matched in the query: an order id is guessable from a
 * timestamp (`MG-${Date.now()}`), so scoping the lookup is what keeps one
 * customer's name, phone, and address from being readable by another.
 */
async function getOrderForUser(orderId, userId) {
  const pool = getPool();
  if (!pool) return null;

  const result = await pool.query(
    `SELECT * FROM orders WHERE order_id = $1 AND user_id = $2`,
    [orderId, userId],
  );
  const row = result.rows[0];
  return row ? toDetail(row) : null;
}

/**
 * Erase a withdrawn user's orders.
 *
 * The rows are deleted outright rather than anonymised — nothing downstream
 * reads them for accounting, and retaining a shipping address after a
 * withdrawal request is the thing being avoided.
 */
async function deleteOrdersByUser(userId) {
  const pool = getPool();
  if (!pool) throw new Error('Database not configured - cannot erase orders.');

  const result = await pool.query('DELETE FROM orders WHERE user_id = $1', [userId]);
  return result.rowCount || 0;
}

module.exports = {
  ORDER_STATUS,
  STATUS_LABEL,
  saveOrder,
  listOrdersByUser,
  getOrderForUser,
  deleteOrdersByUser,
  // exported for tests
  toAmount,
  summarizeLines,
  resolvePrintSides,
  toSummary,
  toDetail,
};
