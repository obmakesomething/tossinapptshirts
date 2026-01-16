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
    html, body { width: 100%; height: 100%; overflow: hidden; background: white; }
    #wrap { width: 100%; height: 100%; display: flex; align-items: center; justify-content: center; }
  </style>
</head>
<body>
  <div id="wrap"></div>
  <script src="https://t1.daumcdn.net/mapjsapi/bundle/postcode/prod/postcode.v2.js"></script>
  <script>
    function sendMessage(messageObj) {
      const message = JSON.stringify(messageObj);
      console.log('[DaumPostcode WebView] Attempting to send:', message);

      try {
        if (window.ReactNativeWebView && typeof window.ReactNativeWebView.postMessage === 'function') {
          console.log('[DaumPostcode WebView] Sending via ReactNativeWebView.postMessage');
          window.ReactNativeWebView.postMessage(message);
          return true;
        }

        if (window.webkit && window.webkit.messageHandlers && window.webkit.messageHandlers.ReactNativeWebView) {
          console.log('[DaumPostcode WebView] Sending via webkit.messageHandlers');
          window.webkit.messageHandlers.ReactNativeWebView.postMessage(message);
          return true;
        }

        console.error('[DaumPostcode WebView] No message bridge available!');
        console.error('[DaumPostcode WebView] window.ReactNativeWebView:', window.ReactNativeWebView);
        console.error('[DaumPostcode WebView] window.webkit:', window.webkit);
        return false;
      } catch (error) {
        console.error('[DaumPostcode WebView] Error sending message:', error);
        return false;
      }
    }

    // Log immediately to verify script execution
    console.log('[DaumPostcode WebView] Script loaded, initializing...');

    // Wait for DOM to be ready
    document.addEventListener('DOMContentLoaded', function() {
      console.log('[DaumPostcode WebView] DOM ready, creating Postcode instance');

      const element = document.getElementById('wrap');
      if (!element) {
        console.error('[DaumPostcode WebView] Cannot find #wrap element!');
        return;
      }

      new daum.Postcode({
        oncomplete: function(data) {
          console.log('[DaumPostcode WebView] ========== oncomplete FIRED ==========');
          console.log('[DaumPostcode WebView] Address data:', data);

          const success = sendMessage({
            type: 'complete',
            data: data
          });

          console.log('[DaumPostcode WebView] Message send result:', success);
          console.log('[DaumPostcode WebView] ====================================');
        },
        onclose: function(state) {
          console.log('[DaumPostcode WebView] onclose fired, state:', state);
          sendMessage({
            type: 'close',
            closeState: state
          });
        },
        width: '100%',
        height: '100%'
      }).embed(element);

      console.log('[DaumPostcode WebView] Daum Postcode embed() called successfully');
    });
  </script>
</body>
</html>
`;

export function DaumPostcodeModal({ visible, onClose, onSelect }: DaumPostcodeModalProps) {
    const handleMessage = (event: { nativeEvent: { data: string } }) => {
        try {
            console.log('[DaumPostcode] Received raw message:', event.nativeEvent.data);

            const message = JSON.parse(event.nativeEvent.data);
            console.log('[DaumPostcode] Parsed message type:', message.type);
            console.log('[DaumPostcode] Full message object:', JSON.stringify(message, null, 2));

            // Handle address selection completion
            if (message.type === 'complete' && message.data) {
                const addressData = message.data;
                console.log('[DaumPostcode] ===== ADDRESS SELECTED =====');
                console.log('[DaumPostcode] zonecode:', addressData.zonecode);
                console.log('[DaumPostcode] roadAddress:', addressData.roadAddress);
                console.log('[DaumPostcode] jibunAddress:', addressData.jibunAddress);
                console.log('[DaumPostcode] sido:', addressData.sido);
                console.log('[DaumPostcode] sigungu:', addressData.sigungu);
                console.log('[DaumPostcode] =============================');

                // Call onSelect FIRST to update parent state
                console.log('[DaumPostcode] Calling onSelect callback...');
                onSelect(addressData as AddressData);

                // Close modal AFTER a delay to ensure state update completes
                console.log('[DaumPostcode] Scheduling modal close in 100ms...');
                setTimeout(() => {
                    console.log('[DaumPostcode] Closing modal now');
                    onClose();
                }, 100);

                return;
            }

            // Handle X button close
            if (message.type === 'close') {
                console.log('[DaumPostcode] User closed modal via X button, state:', message.closeState);
                onClose();
                return;
            }

            console.warn('[DaumPostcode] Unknown message type:', message.type);
        } catch (error) {
            console.error('[DaumPostcode] Failed to parse message:', error);
            console.error('[DaumPostcode] Raw data that failed to parse:', event.nativeEvent.data);
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
