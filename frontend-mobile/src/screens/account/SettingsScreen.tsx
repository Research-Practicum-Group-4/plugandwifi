import { useState } from 'react';
import { Alert, Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT, type Lang } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LANGUAGES } from '../../i18n/translations';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const { t, lang, setLang } = useT();
  const { mode, setMode, colors } = useTheme();
  const { user } = useAuth();
  const [langModal, setLangModal] = useState(false);
  const [notifications, setNotifications] = useState(true);

  function handleDeleteAccount() {
    Alert.alert(
      t('settings.deleteAccount'),
      t('settings.deleteConfirmMsg'),
      [{ text: t('common.cancel'), style: 'cancel' }, { text: t('settings.deleteAccount'), style: 'destructive', onPress: () => { Alert.alert(t('settings.comingSoon'), t('settings.deleteSoonMsg')); } }],
    );
  }

  const currentLangLabel = LANGUAGES.find(l => l.key === lang)?.label || 'English';

  return (
    <View style={[S.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={[S.headerSafe, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
      <View style={S.header}>
        <Pressable style={S.backBtn} onPress={() => navigation.goBack()} hitSlop={16}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[S.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={S.backBtn} />
      </View>
      </SafeAreaView>

      <ScrollView style={S.body} showsVerticalScrollIndicator={false}>
        <View style={[S.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[S.sectionLabel, { color: colors.textMuted }]}>{t('settings.language')}</Text>
          <Pressable style={S.pickerBtn} onPress={() => setLangModal(true)}>
            <Text style={[S.pickerText, { color: colors.text }]}>{currentLangLabel}</Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={[S.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[S.sectionLabel, { color: colors.textMuted }]}>{t('settings.appearance')}</Text>
          <View style={S.segmentRow}>
            {(['light', 'system', 'dark'] as Array<'light' | 'system' | 'dark'>).map(m => (
              <Pressable
                key={m}
                style={[S.segment, { borderColor: colors.border }, mode === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setMode(m)}
              >
                <Text style={[S.segmentText, { color: colors.text }, mode === m && { color: colors.white }]}>
                  {m === 'light' ? t('settings.light') : m === 'dark' ? t('settings.dark') : t('settings.system')}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[S.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[S.sectionLabel, { color: colors.textMuted }]}>{t('settings.notifications')}</Text>
          <View style={S.row}>
            <Text style={[S.rowLabel, { color: colors.text }]}>{t('settings.notifications')}</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: colors.border, true: colors.primary }}
              thumbColor={colors.white}
            />
          </View>
        </View>

        <View style={[S.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={[S.sectionLabel, { color: colors.textMuted }]}>{t('settings.about')}</Text>
          <Text style={[S.versionText, { color: colors.textMuted }]}>Plug & Wifi</Text>
          <Text style={[S.versionText, { color: colors.textMuted }]}>{t('settings.version')} 1.0.0</Text>
        </View>

        {user ? (
          <View style={[S.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={[S.sectionLabel, { color: colors.textMuted }]}>{t('settings.accountDetails')}</Text>
            <View style={S.infoRow}>
              <Text style={[S.infoLabel, { color: colors.textMuted }]}>{t('settings.name')}</Text>
              <Text style={[S.infoValue, { color: colors.text }]}>{user.full_name}</Text>
            </View>
            <View style={S.infoRow}>
              <Text style={[S.infoLabel, { color: colors.textMuted }]}>{t('settings.email')}</Text>
              <Text style={[S.infoValue, { color: colors.text }]}>{user.email}</Text>
            </View>
             <Pressable style={[S.deleteBtn, { borderColor: colors.danger }]} onPress={handleDeleteAccount}>
              <Text style={[S.deleteBtnText, { color: colors.danger }]}>{t('settings.deleteAccount')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={langModal} transparent animationType="fade">
        <Pressable style={S.modalOverlay} onPress={() => setLangModal(false)}>
          <View style={[S.pickerModal, { backgroundColor: colors.white }]}>
            <Text style={[S.pickerModalTitle, { color: colors.text }]}>{t('settings.language')}</Text>
            {LANGUAGES.map(l => (
              <Pressable
                key={l.key}
                style={[S.langItem, lang === l.key && { backgroundColor: colors.surface }]}
                onPress={() => { setLang(l.key as Lang); setLangModal(false); }}
              >
                <Text style={[S.langLabel, { color: colors.text }, lang === l.key && { color: colors.primary, fontWeight: '700' }]}>
                  {l.label}
                </Text>
                {lang === l.key ? <Text style={{ color: colors.primary }}>✓</Text> : null}
              </Pressable>
            ))}
          </View>
        </Pressable>
      </Modal>
    </View>
  );
}

const S = StyleSheet.create({
  container: { flex: 1 },
  headerSafe: { borderBottomWidth: 1 },
  header: {
    flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between',
    paddingHorizontal: spacing.md, paddingVertical: spacing.sm,
  },
  headerTitle: { fontSize: 18, fontWeight: '600' },
  backBtn: { width: 36, height: 36, alignItems: 'center', justifyContent: 'center' },
  body: { flex: 1, padding: spacing.lg },
  section: {
    marginBottom: spacing.lg, padding: spacing.md,
    borderRadius: 12, borderWidth: 1,
  },
  sectionLabel: { fontSize: 13, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15 },
  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, borderWidth: 1, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600' },
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pickerText: { fontSize: 15 },
  versionText: { fontSize: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  deleteBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderRadius: 10 },
  deleteBtnText: { fontSize: 14, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  pickerModal: {
    width: '80%', borderRadius: 14, padding: spacing.lg, gap: spacing.sm,
  },
  pickerModalTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.sm },
  langItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8,
  },
  langLabel: { fontSize: 16 },
});
