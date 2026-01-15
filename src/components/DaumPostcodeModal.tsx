import React from 'react';
import { Modal, StyleSheet, View, TouchableOpacity, Text, SafeAreaView } from 'react-native';
import { WebView } from '@granite-js/native/react-native-webview';
import { theme } from './ui';

interface AddressData {
    zonecode: string; // 우편번호
    address: string; // 기본주소
    addressEnglish: string; // 영문주소
    addressType: string; // R: 도로명, J: 지번
    userSelectedType: string; // 사용자가 선택한 주소 타입
    roadAddress: string; // 도로명 주소
    roadAddressEnglish: string;
    jibunAddress: string; // 지번 주소
    jibunAddressEnglish: string;
    buildingName: string; // 건물명
    buildingCode: string;
    apartment: string; // 아파트 여부 Y/N
    sido: string; // 시/도
    sidoEnglish: string;
    sigungu: string; // 시/군/구
    sigunguEnglish: string;
    sigunguCode: string;
    bname: string; // 법정동/법정리
    bnameEnglish: string;
    bname1: string;
    bname2: string;
}

interface DaumPostcodeModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (data: AddressData) => void;
}

const POSTCODE_HTML = `
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
  <title>주소 검색</title>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    html, body { width: 100%; height: 100%; overflow: hidden; }
    #layer { width: 100%; height: 100%; }
  </style>
</head>
<body>
  <div id="layer"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    new daum.Postcode({
      oncomplete: function(data) {
        // 주소 선택 시 데이터 전송
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      },
      onclose: function(state) {
        // 닫기 버튼 클릭 시 (FORCE_CLOSE) 또는 주소 선택 후 닫힘 (COMPLETE_CLOSE)
        if (state === 'FORCE_CLOSE') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ _close: true }));
        }
      },
      width: '100%',
      height: '100%'
    }).embed(document.getElementById('layer'), {
      autoClose: true // 주소 선택 후 자동으로 닫힘
    });
  </script>
</body>
</html>
`;

export function DaumPostcodeModal({ visible, onClose, onSelect }: DaumPostcodeModalProps) {
    const handleMessage = (event: { nativeEvent: { data: string } }) => {
        try {
            console.log('[DaumPostcode] Received message:', event.nativeEvent.data);
            const data = JSON.parse(event.nativeEvent.data);
            console.log('[DaumPostcode] Parsed data:', data);

            if (data._close) {
                console.log('[DaumPostcode] Closing modal');
                onClose();
                return;
            }

            console.log('[DaumPostcode] Selecting address:', data.address);
            onSelect(data as AddressData);
            console.log('[DaumPostcode] onSelect called, now closing');
            onClose();
        } catch (error) {
            console.error('[DaumPostcode] Failed to parse data:', error, 'Raw:', event.nativeEvent.data);
        }
    };

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Text style={styles.title}>주소 검색</Text>
                    <TouchableOpacity onPress={onClose} style={styles.closeButton}>
                        <Text style={styles.closeText}>닫기</Text>
                    </TouchableOpacity>
                </View>
                <WebView
                    source={{ html: POSTCODE_HTML }}
                    onMessage={handleMessage}
                    style={styles.webview}
                    javaScriptEnabled
                    domStorageEnabled
                />
            </SafeAreaView>
        </Modal>
    );
}

const styles = StyleSheet.create({
    container: {
        flex: 1,
        backgroundColor: theme.colors.background,
    },
    header: {
        flexDirection: 'row',
        justifyContent: 'space-between',
        alignItems: 'center',
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
        borderBottomWidth: 1,
        borderBottomColor: theme.colors.border,
        backgroundColor: theme.colors.surface,
    },
    title: {
        fontSize: 17,
        fontWeight: '600',
        color: theme.colors.textPrimary,
    },
    closeButton: {
        paddingVertical: theme.spacing.xs,
        paddingHorizontal: theme.spacing.sm,
    },
    closeText: {
        fontSize: 15,
        color: theme.colors.primary,
        fontWeight: '500',
    },
    webview: {
        flex: 1,
    },
});

export type { AddressData };
