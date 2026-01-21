#!/usr/bin/env node
/**
 * 이메일 발송 테스트 스크립트
 * 
 * 사용법:
 *   node server/test-email.js [수신자이메일]
 * 
 * 예시:
 *   node server/test-email.js test@example.com
 * 
 * 환경변수 필요:
 *   SMTP_USER, SMTP_PASS, SMTP_HOST (선택), SMTP_PORT (선택), SMTP_FROM (선택)
 */

try { require('dotenv').config(); } catch {}
const nodemailer = require('nodemailer');

async function testEmail() {
  const recipient = process.argv[2];
  
  if (!recipient) {
    console.error('❌ 수신자 이메일을 입력해 주세요.');
    console.log('사용법: node server/test-email.js your@email.com');
    process.exit(1);
  }

  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (!user || !pass) {
    console.error('❌ SMTP 설정이 없어요.');
    console.log('필요한 환경변수: SMTP_USER, SMTP_PASS');
    process.exit(1);
  }

  console.log('📧 이메일 설정 확인 중...');
  console.log(`   SMTP_HOST: ${process.env.SMTP_HOST || 'smtp.gmail.com'}`);
  console.log(`   SMTP_PORT: ${process.env.SMTP_PORT || '465'}`);
  console.log(`   SMTP_USER: ${user}`);
  console.log(`   SMTP_FROM: ${process.env.SMTP_FROM || user}`);
  console.log(`   수신자: ${recipient}`);
  console.log('');

  const transporter = nodemailer.createTransport({
    host: process.env.SMTP_HOST || 'smtp.gmail.com',
    port: Number(process.env.SMTP_PORT || 465),
    secure: String(process.env.SMTP_SECURE || 'true') === 'true',
    auth: { user, pass },
  });

  try {
    console.log('🔌 SMTP 서버 연결 테스트...');
    await transporter.verify();
    console.log('✅ SMTP 연결 성공!\n');
  } catch (err) {
    console.error('❌ SMTP 연결 실패:', err.message);
    process.exit(1);
  }

  const testBody = `안녕하세요,

이메일 발송 테스트예요.

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
📧 테스트 정보
━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
발송 시각: ${new Date().toLocaleString('ko-KR', { timeZone: 'Asia/Seoul' })}
SMTP 서버: ${process.env.SMTP_HOST || 'smtp.gmail.com'}
발신자: ${process.env.SMTP_FROM || user}

이 메일을 받으셨다면 이메일 설정이 정상이에요! 🎉

감사합니다.`;

  try {
    console.log('📤 테스트 이메일 발송 중...');
    const info = await transporter.sendMail({
      from: process.env.SMTP_FROM || user,
      to: recipient,
      subject: '🧪 [테스트] 이메일 발송 테스트',
      text: testBody,
    });

    console.log('✅ 이메일 발송 성공!');
    console.log(`   Message ID: ${info.messageId}`);
    console.log(`\n📬 ${recipient} 메일함을 확인해 주세요.`);
  } catch (err) {
    console.error('❌ 이메일 발송 실패:', err.message);
    process.exit(1);
  }
}

testEmail();
