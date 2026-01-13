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
        window.ReactNativeWebView.postMessage(JSON.stringify(data));
      },
      onclose: function(state) {
        if (state === 'FORCE_CLOSE' || state === 'COMPLETE_CLOSE') {
          window.ReactNativeWebView.postMessage(JSON.stringify({ _close: true }));
        }
      },
      width: '100%',
      height: '100%'
    }).embed(document.getElementById('layer'));
  </script>
</body>
</html>
`;

export function DaumPostcodeModal({ visible, onClose, onSelect }: DaumPostcodeModalProps) {
    const handleMessage = (event: { nativeEvent: { data: string } }) => {
        try {
            const data = JSON.parse(event.nativeEvent.data);

            if (data._close) {
                onClose();
                return;
            }

            onSelect(data as AddressData);
            onClose();
        } catch (error) {
            console.error('Failed to parse postcode data:', error);
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
