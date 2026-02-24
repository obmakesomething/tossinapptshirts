import { createRoute } from '@granite-js/react-native';
import React from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { Screen, theme } from '../components/ui';

const NAVY_DEEP = '#F3F4F8';
const NAVY_PANEL = '#FFFFFF';

export const Route = createRoute('/privacy', {
  component: Page,
});

function Page() {
  const navigation = Route.useNavigation();

  return (
    <Screen contentStyle={styles.screenContent}>
      <View style={styles.headerRow}>
        <Text style={styles.headerTitle}>개인정보 처리방침</Text>
        <Pressable onPress={() => navigation.goBack()} style={styles.headerBack}>
          <Text style={styles.headerBackText}>이전</Text>
        </Pressable>
      </View>

      <ScrollView showsVerticalScrollIndicator={false}>
        <View style={styles.content}>
          <Text style={styles.intro}>
            티셔츠메이커(이하 "회사")는 정보통신망 이용촉진 및 정보보호 등에 관한 법률, 개인정보보호법 등 관련 법령상의 개인정보보호 규정을 준수하며, 이용자의 개인정보 보호에 최선을 다하고 있습니다.
          </Text>

          <Text style={styles.sectionTitle}>1. 수집하는 개인정보의 항목 및 수집방법</Text>
          <Text style={styles.paragraph}>
            회사는 서비스 제공을 위해 다음과 같은 개인정보를 수집합니다:{'\n\n'}
            <Text style={styles.bold}>가. 필수 수집 항목</Text>{'\n'}
            • 이름 (user_name){'\n'}
            • 이메일 주소 (user_email){'\n'}
            • 휴대전화번호 (user_phone){'\n'}
            • 연계정보(CI) (user_ci){'\n'}
            • 배송지 주소{'\n\n'}
            <Text style={styles.bold}>나. 자동 수집 항목</Text>{'\n'}
            • 서비스 이용 기록{'\n'}
            • 접속 로그{'\n'}
            • 쿠키{'\n'}
            • 접속 IP 정보{'\n\n'}
            <Text style={styles.bold}>다. 수집 방법</Text>{'\n'}
            • 토스 앱인토스를 통한 회원 정보 연동{'\n'}
            • 주문 및 배송 정보 입력{'\n'}
            • 자동 수집 도구를 통한 정보 수집
          </Text>

          <Text style={styles.sectionTitle}>2. 개인정보의 수집 및 이용목적</Text>
          <Text style={styles.paragraph}>
            회사는 수집한 개인정보를 다음의 목적을 위해 활용합니다:{'\n\n'}
            <Text style={styles.bold}>가. 서비스 제공</Text>{'\n'}
            • 맞춤 제작 상품 주문 처리 및 배송{'\n'}
            • 주문 확인 및 배송 알림{'\n'}
            • 고객 문의 응대{'\n\n'}
            <Text style={styles.bold}>나. 회원 관리</Text>{'\n'}
            • 회원제 서비스 이용에 따른 본인확인{'\n'}
            • 개인 식별{'\n'}
            • 불량회원의 부정 이용 방지{'\n'}
            • 비인가 사용방지{'\n\n'}
            <Text style={styles.bold}>다. 마케팅 및 광고 활용</Text>{'\n'}
            • 신규 서비스 개발 및 맞춤 서비스 제공{'\n'}
            • 이벤트 및 광고성 정보 제공 (별도 동의 시){'\n\n'}
            <Text style={styles.bold}>라. 서비스 개선</Text>{'\n'}
            • 서비스 이용 통계 분석{'\n'}
            • 서비스 품질 개선
          </Text>

          <Text style={styles.sectionTitle}>3. 개인정보의 보유 및 이용기간</Text>
          <Text style={styles.paragraph}>
            회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체 없이 파기합니다. 단, 다음의 정보에 대해서는 아래의 이유로 명시한 기간 동안 보존합니다:{'\n\n'}
            <Text style={styles.bold}>가. 회사 내부 방침에 의한 정보보유 사유</Text>{'\n'}
            • 부정거래 방지 및 쇼핑몰 운영방침에 따른 보관: 5년{'\n\n'}
            <Text style={styles.bold}>나. 관련법령에 의한 정보보유 사유</Text>{'\n'}
            상법, 전자상거래 등에서의 소비자보호에 관한 법률 등 관계법령의 규정에 의하여 보존할 필요가 있는 경우 회사는 관계법령에서 정한 일정한 기간 동안 회원정보를 보관합니다:{'\n\n'}
            • 계약 또는 청약철회 등에 관한 기록: 5년{'\n'}
            • 대금결제 및 재화 등의 공급에 관한 기록: 5년{'\n'}
            • 소비자의 불만 또는 분쟁처리에 관한 기록: 3년{'\n'}
            • 표시·광고에 관한 기록: 6개월{'\n'}
            • 접속에 관한 기록: 3개월
          </Text>

          <Text style={styles.sectionTitle}>4. 개인정보의 파기절차 및 방법</Text>
          <Text style={styles.paragraph}>
            회사는 원칙적으로 개인정보 수집 및 이용목적이 달성된 후에는 해당 정보를 지체없이 파기합니다:{'\n\n'}
            <Text style={styles.bold}>가. 파기절차</Text>{'\n'}
            • 이용자가 입력한 정보는 목적이 달성된 후 별도의 DB로 옮겨져 내부 방침 및 기타 관련 법령에 의한 정보보호 사유에 따라 일정 기간 저장된 후 파기됩니다.{'\n'}
            • 동 개인정보는 법률에 의한 경우가 아니고서는 보유되는 이외의 다른 목적으로 이용되지 않습니다.{'\n\n'}
            <Text style={styles.bold}>나. 파기방법</Text>{'\n'}
            • 전자적 파일형태로 저장된 개인정보는 기록을 재생할 수 없는 기술적 방법을 사용하여 삭제합니다.{'\n'}
            • 종이에 출력된 개인정보는 분쇄기로 분쇄하거나 소각을 통하여 파기합니다.
          </Text>

          <Text style={styles.sectionTitle}>5. 개인정보 제공 및 공유</Text>
          <Text style={styles.paragraph}>
            회사는 이용자의 개인정보를 "2. 개인정보의 수집 및 이용목적"에서 고지한 범위 내에서 사용하며, 이용자의 사전 동의 없이는 동 범위를 초과하여 이용하거나 원칙적으로 이용자의 개인정보를 외부에 공개하지 않습니다.{'\n\n'}
            다만, 아래의 경우에는 예외로 합니다:{'\n'}
            • 이용자가 사전에 동의한 경우{'\n'}
            • 법령의 규정에 의거하거나, 수사 목적으로 법령에 정해진 절차와 방법에 따라 수사기관의 요구가 있는 경우{'\n'}
            • 배송업무 수행을 위해 배송업체에 배송 정보를 제공하는 경우
          </Text>

          <Text style={styles.sectionTitle}>6. 개인정보의 처리위탁</Text>
          <Text style={styles.paragraph}>
            회사는 서비스 향상을 위해서 아래와 같이 개인정보를 위탁하고 있으며, 관계 법령에 따라 위탁계약 시 개인정보가 안전하게 관리될 수 있도록 필요한 사항을 규정하고 있습니다:{'\n\n'}
            <Text style={styles.bold}>현재 위탁 업무:</Text>{'\n'}
            • 배송업체: 상품 배송{'\n'}
            • 결제대행업체: 결제 처리 (향후 추가 예정)
          </Text>

          <Text style={styles.sectionTitle}>7. 이용자의 권리와 그 행사방법</Text>
          <Text style={styles.paragraph}>
            이용자는 언제든지 등록되어 있는 자신의 개인정보를 조회하거나 수정할 수 있으며 삭제를 요청할 수 있습니다:{'\n\n'}
            • 개인정보 조회·수정: 앱 내 1대1 문의를 통해 요청{'\n'}
            • 개인정보 삭제: 앱 탈퇴 또는 1대1 문의를 통해 요청{'\n'}
            • 처리 기간: 요청 후 즉시 또는 3영업일 이내
          </Text>

          <Text style={styles.sectionTitle}>8. 개인정보 자동수집 장치의 설치·운영 및 거부</Text>
          <Text style={styles.paragraph}>
            회사는 이용자의 정보를 수시로 저장하고 찾아내는 '쿠키(cookie)' 등을 운용합니다:{'\n\n'}
            <Text style={styles.bold}>가. 쿠키 등 사용 목적</Text>{'\n'}
            • 이용자의 접속 빈도나 방문 시간 등을 분석{'\n'}
            • 이용자의 취향과 관심분야를 파악{'\n'}
            • 각종 이벤트 참여 정도 및 방문 회수 파악{'\n'}
            • 타겟 마케팅 및 개인 맞춤 서비스 제공{'\n\n'}
            <Text style={styles.bold}>나. 쿠키 설정 거부 방법</Text>{'\n'}
            이용자는 쿠키 설치에 대한 선택권을 가지고 있습니다. 웹브라우저에서 옵션을 설정함으로써 모든 쿠키를 허용하거나, 쿠키가 저장될 때마다 확인을 거치거나, 모든 쿠키의 저장을 거부할 수 있습니다.{'\n\n'}
            다만, 쿠키의 저장을 거부할 경우 로그인이 필요한 일부 서비스 이용에 어려움이 있을 수 있습니다.
          </Text>

          <Text style={styles.sectionTitle}>9. 개인정보 보호책임자</Text>
          <Text style={styles.paragraph}>
            회사는 개인정보 처리에 관한 업무를 총괄해서 책임지고, 개인정보 처리와 관련한 정보주체의 불만처리 및 피해구제 등을 위하여 아래와 같이 개인정보 보호책임자를 지정하고 있습니다:{'\n\n'}
            <Text style={styles.bold}>개인정보 보호책임자</Text>{'\n'}
            • 문의방법: 앱 내 1대1 문의{'\n'}
            • 처리기한: 접수 후 3영업일 이내 회신
          </Text>

          <Text style={styles.sectionTitle}>10. 개인정보의 안전성 확보조치</Text>
          <Text style={styles.paragraph}>
            회사는 개인정보의 안전성 확보를 위해 다음과 같은 조치를 취하고 있습니다:{'\n\n'}
            • 관리적 조치: 내부관리계획 수립·시행, 정기적 직원 교육{'\n'}
            • 기술적 조치: 개인정보처리시스템 등의 접근권한 관리, 접근통제시스템 설치, 암호화 기술 적용{'\n'}
            • 물리적 조치: 전산실, 자료보관실 등의 접근통제
          </Text>

          <Text style={styles.sectionTitle}>11. 개인정보처리방침의 변경</Text>
          <Text style={styles.paragraph}>
            이 개인정보 처리방침은 2026년 1월 13일부터 적용됩니다.{'\n\n'}
            법령·정책 또는 보안기술의 변경에 따라 내용의 추가·삭제 및 수정이 있을 시에는 변경사항의 시행 7일 전부터 앱 내 공지사항을 통하여 고지할 것입니다.
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
  screenContent: {
    backgroundColor: NAVY_DEEP,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: theme.spacing.md,
  },
  headerTitle: {
    fontSize: 20,
    fontWeight: '800',
    color: '#1A1F2E',
  },
  headerBack: {
    borderRadius: 999,
    borderWidth: 1,
    borderColor: 'rgba(220,229,242,0.92)',
    backgroundColor: 'rgba(238,243,255,0.92)',
    paddingVertical: 6,
    paddingHorizontal: 12,
  },
  headerBackText: {
    fontSize: 12,
    color: '#5E667A',
    fontWeight: '700',
  },
  content: {
    backgroundColor: NAVY_PANEL,
    borderRadius: theme.radius.lg,
    paddingHorizontal: theme.spacing.md,
    paddingVertical: theme.spacing.lg,
    paddingBottom: theme.spacing.xl,
    borderWidth: 1,
    borderColor: 'rgba(220,229,242,0.92)',
  },
  intro: {
    fontSize: 13,
    lineHeight: 22,
    color: '#5E667A',
    marginBottom: theme.spacing.lg,
    padding: theme.spacing.md,
    backgroundColor: 'rgba(238,243,255,0.92)',
    borderRadius: theme.radius.sm,
    borderLeftWidth: 4,
    borderLeftColor: '#3182F6',
  },
  sectionTitle: {
    fontSize: 16,
    lineHeight: 24,
    fontWeight: '700',
    color: '#1A1F2E',
    marginTop: theme.spacing.lg,
    marginBottom: theme.spacing.sm,
  },
  paragraph: {
    fontSize: 13,
    lineHeight: 22,
    color: '#5E667A',
    marginBottom: theme.spacing.md,
  },
  bold: {
    fontWeight: '600',
    color: '#1A1F2E',
  },
  footer: {
    fontSize: 12,
    lineHeight: 18,
    color: '#8A93A8',
    marginTop: theme.spacing.xl,
    textAlign: 'center',
  },
});
