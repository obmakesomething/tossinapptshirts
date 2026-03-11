import React, { useMemo, useState } from 'react';
import { Modal, StyleSheet, View, SafeAreaView } from 'react-native';
import { Button, List, ListRow, SearchField, Txt } from '@toss/tds-react-native';
import { theme } from './ui';
import { API_BASE_URL } from '../config';

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

interface KakaoAddressItem {
    address_name?: string;
    road_address?: {
        address_name?: string;
        zone_no?: string;
        region_1depth_name?: string;
        region_2depth_name?: string;
        building_name?: string;
    } | null;
    address?: {
        address_name?: string;
        region_1depth_name?: string;
        region_2depth_name?: string;
    } | null;
}

interface DaumPostcodeModalProps {
    visible: boolean;
    onClose: () => void;
    onSelect: (data: AddressData) => void;
}

export function DaumPostcodeModal({ visible, onClose, onSelect }: DaumPostcodeModalProps) {
    const [query, setQuery] = useState('');
    const [results, setResults] = useState<KakaoAddressItem[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');

    const canSearch = query.trim().length >= 2;

    const handleQueryChange = (event: { nativeEvent?: { text?: string } }) => {
        setQuery(event?.nativeEvent?.text ?? '');
    };

    const handleSearch = async () => {
        if (!canSearch) return;
        setLoading(true);
        setError('');
        try {
            const response = await fetch(`${API_BASE_URL}/v1/address/search?query=${encodeURIComponent(query)}`);
            if (!response.ok) {
                const data = await response.json().catch(() => ({}));
                throw new Error(data.error || '주소를 찾지 못했어요. 다시 검색해 주세요.');
            }
            const data = await response.json();
            setResults(Array.isArray(data.addresses) ? data.addresses : []);
        } catch (err) {
            setError(err instanceof Error ? err.message : '주소를 찾지 못했어요. 다시 검색해 주세요.');
        } finally {
            setLoading(false);
        }
    };

    const mappedResults = useMemo(() => {
        return results.map((item) => {
            const roadAddress = item.road_address?.address_name || '';
            const jibunAddress = item.address?.address_name || item.address_name || '';
            const zonecode = item.road_address?.zone_no || '';
            const sido = item.road_address?.region_1depth_name || item.address?.region_1depth_name || '';
            const sigungu = item.road_address?.region_2depth_name || item.address?.region_2depth_name || '';
            const buildingName = item.road_address?.building_name || '';

            return {
                displayTitle: roadAddress || jibunAddress,
                displaySub: jibunAddress && roadAddress && jibunAddress !== roadAddress ? jibunAddress : '',
                payload: {
                    zonecode,
                    address: roadAddress || jibunAddress,
                    addressEnglish: '',
                    addressType: roadAddress ? 'R' : 'J',
                    userSelectedType: roadAddress ? 'R' : 'J',
                    roadAddress,
                    roadAddressEnglish: '',
                    jibunAddress,
                    jibunAddressEnglish: '',
                    buildingName,
                    buildingCode: '',
                    apartment: '',
                    sido,
                    sidoEnglish: '',
                    sigungu,
                    sigunguEnglish: '',
                    sigunguCode: '',
                    bname: '',
                    bnameEnglish: '',
                    bname1: '',
                    bname2: '',
                } as AddressData,
            };
        });
    }, [results]);

    return (
        <Modal
            visible={visible}
            animationType="slide"
            presentationStyle="pageSheet"
            onRequestClose={onClose}
        >
            <SafeAreaView style={styles.container}>
                <View style={styles.header}>
                    <Txt typography="t4" fontWeight="bold">주소 찾기</Txt>
                    <Button type="light" size="tiny" onPress={onClose}>닫을게요</Button>
                </View>

                <View style={styles.searchSection}>
    <SearchField
        placeholder="도로명이나 지번 주소를 입력해 주세요"
        value={query}
        onChange={handleQueryChange}
        hasClearButton
    />
                    <Button
                        type="primary"
                        size="medium"
                        disabled={!canSearch || loading}
                        onPress={handleSearch}
                        display="block"
                    >
                        {loading ? '찾는 중...' : '검색하기'}
                    </Button>
                </View>

                {error ? (
                    <View style={styles.errorBox}>
                        <Txt typography="t7" color={theme.colors.error}>{error}</Txt>
                    </View>
                ) : null}

                <List rowSeparator="full" style={styles.resultList}>
                    {mappedResults.map((item) => (
                <ListRow
                    key={`${item.payload.zonecode}-${item.displayTitle}`}
                    contents={
                        <ListRow.Texts
                            type={item.displaySub || item.payload.zonecode ? '2RowTypeA' : '1RowTypeA'}
                            top={item.displayTitle || '주소를 찾지 못했어요'}
                            bottom={
                                item.displaySub
                                    ? item.displaySub
                                    : item.payload.zonecode
                                        ? `우편번호 ${item.payload.zonecode}`
                                        : ''
                            }
                            bottomProps={{ color: theme.colors.textSecondary, typography: 't7' }}
                            topProps={{ typography: 't5' }}
                        />
                    }
                    onPress={() => {
                        onSelect(item.payload);
                        onClose();
                    }}
                />
                    ))}
                </List>
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
    searchSection: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.md,
        gap: theme.spacing.sm,
    },
    resultList: {
        flex: 1,
        backgroundColor: theme.colors.surface,
    },
    errorBox: {
        paddingHorizontal: theme.spacing.md,
        paddingVertical: theme.spacing.sm,
    },
});

export type { AddressData };
