import { useState } from 'react';
import { Modal, Pressable, ScrollView, StyleSheet, Switch, Text, View } from 'react-native';
import { ChevronLeft, ChevronDown } from 'lucide-react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useT, type Lang } from '../../context/LanguageContext';
import { useTheme } from '../../context/ThemeContext';
import { useAuth } from '../../context/AuthContext';
import { LANGUAGES } from '../../i18n/translations';
import { colors as staticColors } from '../../theme/colors';
import { spacing } from '../../theme/spacing';
import type { RootStackScreenProps } from '../../types/navigation';

export function SettingsScreen({ navigation }: RootStackScreenProps<'Settings'>) {
  const { t, lang, setLang } = useT();
  const { isDark, mode, setMode, colors } = useTheme();
  const { user } = useAuth();
  const [langModal, setLangModal] = useState(false);
  const [notifications, setNotifications] = useState(true);

  const currentLangLabel = LANGUAGES.find(l => l.key === lang)?.label || 'English';

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <SafeAreaView edges={['top']} style={[styles.headerSafe, { backgroundColor: colors.white, borderBottomColor: colors.border }]}>
      <View style={styles.header}>
        <Pressable style={styles.backBtn} onPress={() => navigation.goBack()} hitSlop={16}>
          <ChevronLeft size={24} color={colors.text} />
        </Pressable>
        <Text style={[styles.headerTitle, { color: colors.text }]}>{t('settings.title')}</Text>
        <View style={styles.backBtn} />
      </View>
      </SafeAreaView>

      <ScrollView style={styles.body} showsVerticalScrollIndicator={false}>
        <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={styles.sectionLabel}>{t('settings.language')}</Text>
          <Pressable style={styles.pickerBtn} onPress={() => setLangModal(true)}>
            <Text style={[styles.pickerText, { color: colors.text }]}>{currentLangLabel}</Text>
            <ChevronDown size={18} color={colors.textMuted} />
          </Pressable>
        </View>

        <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={styles.sectionLabel}>{t('settings.appearance')}</Text>
          <View style={styles.segmentRow}>
            {(['light', 'system', 'dark'] as Array<'light' | 'system' | 'dark'>).map(m => (
              <Pressable
                key={m}
                style={[styles.segment, mode === m && { backgroundColor: colors.primary, borderColor: colors.primary }]}
                onPress={() => setMode(m)}
              >
                <Text style={[styles.segmentText, mode === m && { color: colors.white }]}>
                  {m === 'light' ? t('settings.light') : m === 'dark' ? t('settings.dark') : 'System'}
                </Text>
              </Pressable>
            ))}
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={styles.sectionLabel}>{t('settings.notifications')}</Text>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.text }]}>{t('settings.notifications')}</Text>
            <Switch
              value={notifications}
              onValueChange={setNotifications}
              trackColor={{ false: staticColors.border, true: staticColors.primary }}
              thumbColor={staticColors.white}
            />
          </View>
        </View>

        <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
          <Text style={styles.sectionLabel}>{t('settings.about')}</Text>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>Plug & Wifi</Text>
          <Text style={[styles.versionText, { color: colors.textMuted }]}>{t('settings.version')} 0.1.1</Text>
        </View>

        {user ? (
          <View style={[styles.section, { backgroundColor: colors.white, borderColor: colors.border }]}>
            <Text style={styles.sectionLabel}>Account Details</Text>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Name</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user.full_name}</Text>
            </View>
            <View style={styles.infoRow}>
              <Text style={[styles.infoLabel, { color: colors.textMuted }]}>Email</Text>
              <Text style={[styles.infoValue, { color: colors.text }]}>{user.email}</Text>
            </View>
            <Pressable style={styles.deleteBtn}>
              <Text style={styles.deleteBtnText}>{t('settings.deleteAccount')}</Text>
            </Pressable>
          </View>
        ) : null}
      </ScrollView>

      <Modal visible={langModal} transparent animationType="fade">
        <Pressable style={styles.modalOverlay} onPress={() => setLangModal(false)}>
          <View style={[styles.pickerModal, { backgroundColor: colors.white }]}>
            <Text style={[styles.pickerModalTitle, { color: colors.text }]}>{t('settings.language')}</Text>
            {LANGUAGES.map(l => (
              <Pressable
                key={l.key}
                style={[styles.langItem, lang === l.key && { backgroundColor: colors.surface }]}
                onPress={() => { setLang(l.key as Lang); setLangModal(false); }}
              >
                <Text style={[styles.langLabel, lang === l.key && { color: colors.primary, fontWeight: '700' }]}>
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

const styles = StyleSheet.create({
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
  sectionLabel: { fontSize: 13, color: staticColors.textMuted, marginBottom: spacing.sm, textTransform: 'uppercase', letterSpacing: 1 },
  row: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  rowLabel: { fontSize: 15 },
  segmentRow: { flexDirection: 'row', gap: spacing.xs },
  segment: { flex: 1, borderWidth: 1, borderColor: staticColors.border, borderRadius: 8, paddingVertical: spacing.sm, alignItems: 'center' },
  segmentText: { fontSize: 13, fontWeight: '600', color: staticColors.text },
  pickerBtn: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm,
  },
  pickerText: { fontSize: 15 },
  versionText: { fontSize: 14 },
  infoRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingVertical: 4 },
  infoLabel: { fontSize: 14 },
  infoValue: { fontSize: 14, fontWeight: '500' },
  deleteBtn: { marginTop: spacing.md, paddingVertical: spacing.sm, alignItems: 'center', borderWidth: 1, borderColor: staticColors.danger, borderRadius: 10 },
  deleteBtnText: { fontSize: 14, color: staticColors.danger, fontWeight: '600' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.3)', justifyContent: 'center', alignItems: 'center' },
  pickerModal: {
    width: '80%', borderRadius: 14, padding: spacing.lg, gap: spacing.sm,
  },
  pickerModalTitle: { fontSize: 17, fontWeight: '600', marginBottom: spacing.sm },
  langItem: {
    flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center',
    paddingVertical: spacing.sm, paddingHorizontal: spacing.md, borderRadius: 8,
  },
  langLabel: { fontSize: 16, color: staticColors.text },
});
