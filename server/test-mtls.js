/**
 * mTLS 연결 테스트 스크립트
 * 사용법: node server/test-mtls.js
 */

require('dotenv').config();
const https = require('https');
const fs = require('fs');
const path = require('path');

const TOSSPAY_API_URL = process.env.TOSSPAY_API_URL || 'https://pay-apps-in-toss-api.toss.im';

async function testMTLS() {
    console.log('=== mTLS 연결 테스트 ===\n');

    // 1. 환경변수 체크
    console.log('1. 환경변수 확인:');
    const mtlsKeyBase64 = process.env.MTLS_KEY_BASE64;
    const mtlsCertBase64 = process.env.MTLS_CERT_BASE64;

    if (!mtlsKeyBase64) {
        console.log('   ❌ MTLS_KEY_BASE64 환경변수가 없습니다.');
    } else {
        console.log('   ✅ MTLS_KEY_BASE64 존재 (', mtlsKeyBase64.substring(0, 30), '...)');
    }

    if (!mtlsCertBase64) {
        console.log('   ❌ MTLS_CERT_BASE64 환경변수가 없습니다.');
    } else {
        console.log('   ✅ MTLS_CERT_BASE64 존재 (', mtlsCertBase64.substring(0, 30), '...)');
    }

    if (!mtlsKeyBase64 || !mtlsCertBase64) {
        console.log('\n❌ mTLS 환경변수가 설정되지 않았습니다.');
        console.log('\n해결 방법:');
        console.log('1. mTLS 인증서 파일을 base64로 인코딩:');
        console.log('   cat "mTLS인증서관련/merchadisegpt2_private.key" | base64 | tr -d \'\\n\'');
        console.log('   cat "mTLS인증서관련/merchadisegpt2_public.crt" | base64 | tr -d \'\\n\'');
        console.log('\n2. GCP Secret Manager 또는 환경변수에 추가:');
        console.log('   MTLS_KEY_BASE64=<private key base64>');
        console.log('   MTLS_CERT_BASE64=<certificate base64>');
        return;
    }

    // 2. Base64 디코딩 테스트
    console.log('\n2. Base64 디코딩 테스트:');
    let key, cert;
    try {
        key = Buffer.from(mtlsKeyBase64, 'base64').toString('utf-8');
        cert = Buffer.from(mtlsCertBase64, 'base64').toString('utf-8');
        console.log('   ✅ Base64 디코딩 성공');
        console.log('   Key 헤더:', key.substring(0, 60));
        console.log('   Cert 헤더:', cert.substring(0, 60));
    } catch (err) {
        console.log('   ❌ Base64 디코딩 실패:', err.message);
        return;
    }

    // 3. 인증서 형식 검증
    console.log('\n3. 인증서 형식 검증:');
    if (!key.includes('BEGIN') || (!key.includes('PRIVATE KEY') && !key.includes('RSA PRIVATE KEY'))) {
        console.log('   ❌ Private key 형식 오류 - BEGIN PRIVATE KEY 포함 필요');
        return;
    }
    console.log('   ✅ Private key 형식 정상');

    if (!cert.includes('BEGIN CERTIFICATE')) {
        console.log('   ❌ Certificate 형식 오류 - BEGIN CERTIFICATE 포함 필요');
        return;
    }
    console.log('   ✅ Certificate 형식 정상');

    if (key.includes('ENCRYPTED')) {
        console.log('   ⚠️ Private key가 암호화되어 있음 (passphrase 필요)');
    }

    // 4. HTTPS Agent 생성 테스트
    console.log('\n4. HTTPS Agent 생성 테스트:');
    let agent;
    try {
        agent = new https.Agent({
            key,
            cert,
            rejectUnauthorized: true,
        });
        console.log('   ✅ HTTPS Agent 생성 성공');
    } catch (err) {
        console.log('   ❌ HTTPS Agent 생성 실패:', err.message);
        return;
    }

    // 5. Toss API 연결 테스트 (간단한 health check)
    console.log('\n5. Toss API 연결 테스트:');
    console.log('   Target URL:', TOSSPAY_API_URL);

    try {
        const axios = require('axios');

        // 간단한 테스트 요청 (결제 생성) - 실제로 결제가 되지는 않음
        const testPayload = {
            orderNo: `TEST-${Date.now()}`,
            productDesc: 'mTLS 테스트',
            amount: 100,
            amountTaxFree: 0,
            isTestPayment: true,
        };

        console.log('   요청 payload:', JSON.stringify(testPayload, null, 2));

        const response = await axios({
            method: 'POST',
            url: `${TOSSPAY_API_URL}/api-partner/v1/apps-in-toss/pay/make-payment`,
            headers: {
                'Content-Type': 'application/json',
                'x-toss-user-key': 'test-user-key-for-mtls-validation',
            },
            data: testPayload,
            httpsAgent: agent,
            timeout: 10000,
            validateStatus: () => true, // 모든 응답 허용
        });

        console.log('\n   응답 상태:', response.status);
        console.log('   응답 데이터:', JSON.stringify(response.data, null, 2));

        if (response.status === 200 || response.status === 400) {
            // 400은 user-key 오류일 수 있으므로 mTLS 자체는 성공
            if (response.data?.error?.errorCode === 4010) {
                console.log('\n   ❌ mTLS 인증 실패 - 인증서가 서버에 등록되지 않았거나 만료됨');
                console.log('   → Toss에 인증서 재등록 필요');
            } else if (response.data?.error?.errorCode === 4001) {
                console.log('\n   ⚠️ user-key 오류 (mTLS 연결은 성공!)');
                console.log('   → mTLS 인증서는 정상적으로 작동합니다');
            } else if (response.data?.resultType === 'SUCCESS') {
                console.log('\n   ✅ mTLS 연결 성공!');
            } else {
                console.log('\n   ⚠️ 응답 확인 필요 - errorCode:', response.data?.error?.errorCode);
            }
        } else {
            console.log('\n   ❌ 연결 실패 - HTTP', response.status);
        }
    } catch (err) {
        console.log('   ❌ 연결 실패:', err.message);
        if (err.code === 'ECONNREFUSED') {
            console.log('   → 서버 연결 거부됨');
        } else if (err.code === 'DEPTH_ZERO_SELF_SIGNED_CERT') {
            console.log('   → 자체 서명 인증서 문제');
        } else if (err.code === 'ERR_SSL_WRONG_VERSION_NUMBER') {
            console.log('   → SSL 버전 불일치');
        } else if (err.message.includes('certificate')) {
            console.log('   → 인증서 관련 오류');
        }
    }

    console.log('\n=== 테스트 완료 ===');
}

testMTLS().catch(console.error);
