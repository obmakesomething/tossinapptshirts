import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, TopBar, theme } from '../components/ui';

export const Route = createRoute('/terms', {
  component: Page,
});

function Page() {
  return (
    <Screen>
      <TopBar title="서비스 이용약관" />

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.sectionTitle}>제 1 조 (목적)</Text>
          <Text style={styles.paragraph}>
            본 약관은 티셔츠메이커(이하 "회사")가 제공하는 맞춤 티셔츠 제작 서비스(이하 "서비스")의 이용과 관련하여 회사와 이용자 간의 권리, 의무 및 책임사항을 규정함을 목적으로 합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 2 조 (정의)</Text>
          <Text style={styles.paragraph}>
            1. "서비스"란 회사가 제공하는 티셔츠, 후드, 맨투맨 등의 맞춤 제작 서비스를 의미합니다.{'\n'}
            2. "이용자"란 본 약관에 따라 회사가 제공하는 서비스를 이용하는 자를 말합니다.{'\n'}
            3. "주문"이란 이용자가 서비스를 통해 제품 제작을 요청하는 것을 의미합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 3 조 (약관의 명시와 개정)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 본 약관의 내용을 이용자가 쉽게 알 수 있도록 서비스 초기 화면에 게시합니다.{'\n'}
            2. 회사는 필요한 경우 관련 법령을 위배하지 않는 범위에서 본 약관을 개정할 수 있습니다.{'\n'}
            3. 약관이 개정되는 경우 회사는 개정내용과 적용일자를 명시하여 사전에 공지합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 4 조 (서비스의 제공)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 다음과 같은 서비스를 제공합니다:{'\n'}
            {'   '}• 맞춤 디자인 티셔츠, 후드, 맨투맨 제작{'\n'}
            {'   '}• AI 이미지 생성 및 스타일 변환{'\n'}
            {'   '}• 이미지 업로드 및 편집{'\n'}
            {'   '}• 텍스트 디자인 추가{'\n'}
            {'   '}• 제품 미리보기 및 주문{'\n'}
            2. 서비스는 연중무휴 1일 24시간 제공함을 원칙으로 합니다.{'\n'}
            3. 회사는 시스템 점검, 증설 및 교체 등 필요한 경우 서비스 제공을 일시적으로 중단할 수 있습니다.
          </Text>

          <Text style={styles.sectionTitle}>제 5 조 (주문 및 결제)</Text>
          <Text style={styles.paragraph}>
            1. 이용자는 서비스에서 제공하는 방법에 따라 주문을 신청합니다.{'\n'}
            2. 주문 시 다음 사항을 정확히 입력해야 합니다:{'\n'}
            {'   '}• 상품명, 수량, 색상, 사이즈{'\n'}
            {'   '}• 디자인 이미지 및 텍스트{'\n'}
            {'   '}• 배송 정보 (이름, 주소, 연락처){'\n'}
            3. 회사는 주문 접수 후 이메일로 주문 확인서를 발송합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 6 조 (제작 및 배송)</Text>
          <Text style={styles.paragraph}>
            1. 제작 기간은 주문 확정 후 약 7-10일이 소요됩니다.{'\n'}
            2. 배송은 제작 완료 후 2-3일 이내에 이루어집니다.{'\n'}
            3. 천재지변, 물량 폭주 등 불가항력적인 사유가 발생한 경우 배송이 지연될 수 있습니다.{'\n'}
            4. 배송비는 기본 3,000원이며, 60,000원 이상 구매 시 무료입니다.
          </Text>

          <Text style={styles.sectionTitle}>제 7 조 (환불 및 교환)</Text>
          <Text style={styles.paragraph}>
            1. 맞춤 제작 상품의 특성상 단순 변심에 의한 환불은 불가능합니다.{'\n'}
            2. 다음의 경우 교환 또는 환불이 가능합니다:{'\n'}
            {'   '}• 제작 오류가 있는 경우{'\n'}
            {'   '}• 상품에 불량이 있는 경우{'\n'}
            {'   '}• 주문한 상품과 다른 상품이 배송된 경우{'\n'}
            3. 교환 및 환불 요청은 상품 수령 후 3일 이내에 1대1 문의를 통해 접수해야 합니다.{'\n'}
            4. 이용자의 귀책사유로 인한 상품 훼손은 교환 및 환불이 불가능합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 8 조 (저작권 및 책임)</Text>
          <Text style={styles.paragraph}>
            1. 이용자가 업로드한 이미지 및 디자인에 대한 저작권은 이용자에게 있습니다.{'\n'}
            2. 이용자는 저작권, 초상권, 상표권 등 타인의 권리를 침해하지 않는 이미지만을 사용해야 합니다.{'\n'}
            3. 저작권 침해로 인한 법적 책임은 이용자에게 있으며, 이로 인해 회사가 손해를 입은 경우 이용자는 그 손해를 배상해야 합니다.{'\n'}
            4. 회사는 이용자가 업로드한 이미지를 주문 제작 목적으로만 사용하며, 이용자의 동의 없이 다른 용도로 사용하지 않습니다.
          </Text>

          <Text style={styles.sectionTitle}>제 9 조 (개인정보보호)</Text>
          <Text style={styles.paragraph}>
            회사는 관련 법령이 정하는 바에 따라 이용자의 개인정보를 보호하기 위해 노력합니다. 개인정보의 보호 및 이용에 대해서는 별도의 개인정보 처리방침을 적용합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 10 조 (회사의 의무)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 관련 법령과 본 약관이 금지하거나 미풍양속에 반하는 행위를 하지 않으며, 계속적이고 안정적으로 서비스를 제공하기 위해 노력합니다.{'\n'}
            2. 회사는 이용자의 개인정보 보호를 위해 보안시스템을 구축하며 개인정보 처리방침을 공시하고 준수합니다.{'\n'}
            3. 회사는 서비스 이용과 관련하여 이용자로부터 제기된 의견이나 불만이 정당하다고 인정될 경우 이를 처리하여야 합니다.
          </Text>

          <Text style={styles.sectionTitle}>제 11 조 (이용자의 의무)</Text>
          <Text style={styles.paragraph}>
            이용자는 다음 행위를 하여서는 안 됩니다:{'\n'}
            1. 타인의 저작권, 초상권, 상표권 등을 침해하는 이미지 사용{'\n'}
            2. 허위 내용의 등록{'\n'}
            3. 회사의 서비스 운영을 고의로 방해하는 행위{'\n'}
            4. 음란물 또는 불법적인 내용의 디자인 주문{'\n'}
            5. 기타 관련 법령에 위배되는 행위
          </Text>

          <Text style={styles.sectionTitle}>제 12 조 (면책조항)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 천재지변, 전쟁, 기간통신사업자의 서비스 중지 등 불가항력으로 인하여 서비스를 제공할 수 없는 경우 책임이 면제됩니다.{'\n'}
            2. 회사는 이용자의 귀책사유로 인한 서비스 이용의 장애에 대하여 책임을 지지 않습니다.{'\n'}
            3. 회사는 이용자가 서비스를 이용하여 기대하는 수익을 얻지 못하거나 상실한 것에 대하여 책임을 지지 않습니다.{'\n'}
            4. 회사는 이용자가 업로드한 이미지의 저작권 침해로 인한 법적 책임을 지지 않습니다.
          </Text>

          <Text style={styles.sectionTitle}>제 13 조 (분쟁해결)</Text>
          <Text style={styles.paragraph}>
            1. 회사는 이용자가 제기하는 정당한 의견이나 불만을 반영하고 그 피해를 보상처리하기 위하여 고객센터를 설치·운영합니다.{'\n'}
            2. 회사와 이용자 간 발생한 분쟁에 관한 소송은 민사소송법상의 관할법원에 제소합니다.
          </Text>

          <Text style={styles.sectionTitle}>부칙</Text>
          <Text style={styles.paragraph}>
            본 약관은 2026년 1월 13일부터 시행됩니다.
          </Text>

          <Text style={styles.footer}>
            문의사항이 있으시면 앱 내 1대1 문의를 이용해 주세요.
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: {
    paddingBottom: theme.spacing.xl,
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: theme.colors.textPrimary,
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 22,
    color: theme.colors.textSecondary,
    marginBottom: theme.spacing.md,
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: theme.colors.textTertiary,
    marginTop: theme.spacing.xl,
    textAlign: 'center',
  },
});
