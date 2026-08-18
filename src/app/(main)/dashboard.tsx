import { ThemedText } from '@/components/themed-text';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { TextInput as LcrTextInput } from '@/components/ui/TextInput';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import { CheckCircle, Database, FileText, UploadCloud, X } from 'lucide-react-native';
import { useState } from 'react';
import {
  Dimensions,
  Image,
  Modal,
  Pressable,
  RefreshControl,
  ScrollView,
  StyleSheet,
  TouchableOpacity,
  View
} from 'react-native';

const { width: SCREEN_WIDTH, height: SCREEN_HEIGHT } = Dimensions.get('window');

// ─── Types ───────────────────────────────────────────────────────────────────
interface UnifiedRecord {
  id: number;
  record_type?: 'birth' | 'death' | 'general';
  name?: string;
  name_of_child?: string;
  name_of_deceased?: string;
  serial_number?: string;
  lcr_number?: string;
  category?: string;
  date?: string;
  date_of_birth?: string;
  date_of_death?: string;
  created_at?: string;
  imageUrl?: string | null;
}

// ─── Image Zoom Modal ─────────────────────────────────────────────────────────
function ImageZoomModal({ uri, visible, onClose }: { uri: string; visible: boolean; onClose: () => void }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose}>
      <Pressable style={styles.modalOverlay} onPress={onClose}>
        <View style={styles.modalContent}>
          <Image
            source={{ uri }}
            style={styles.zoomedImage}
            resizeMode="contain"
          />
          <Pressable style={styles.closeButton} onPress={onClose}>
            <X color="#fff" size={24} />
          </Pressable>
        </View>
      </Pressable>
    </Modal>
  );
}

const emptyBirthForm = () => ({
  lcr_number: '',
  date_of_registration: '',
  name_of_child: '',
  sex: '',
  date_of_birth: '',
  place_of_birth: '',
  type_of_birth: '',
  order: '',
  mother_name: '',
  mother_age: '',
  mother_nationality: '',
  mother_religion: '',
  father_name: '',
  father_age: '',
  father_nationality: '',
  father_religion: '',
  municipality_province: '',
  remarks: '',
});

function BirthRegistrationModal({
  visible,
  onClose,
  onSaved,
}: {
  visible: boolean;
  onClose: () => void;
  onSaved: () => void;
}) {
  const theme = useTheme();
  const [form, setForm] = useState(emptyBirthForm());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  const updateField = (field: string, value: string) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  const resetForm = () => {
    setForm(emptyBirthForm());
    setError('');
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async () => {
    if (!form.name_of_child.trim()) {
      setError('Name of child is required.');
      return;
    }

    setSubmitting(true);
    setError('');

    try {
      await api.post('/api/birth-records', form);
      resetForm();
      onSaved();
      onClose();
    } catch (e: any) {
      const message = e?.response?.data?.error || 'Failed to save birth record.';
      setError(message);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <Modal visible={visible} transparent animationType="slide" onRequestClose={handleClose}>
      <View style={styles.modalBackdrop}>
        <View style={[styles.birthModalCard, { backgroundColor: theme.background }]}> 
          <View style={styles.modalHeader}>
            <ThemedText type="title" style={styles.modalTitle}>Register Birth Record</ThemedText>
            <TouchableOpacity onPress={handleClose} style={styles.closeIconWrap}>
              <X color={theme.text} size={22} />
            </TouchableOpacity>
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={styles.formScroll}>
            <Card style={styles.formSectionCard}>
              <ThemedText type="default" style={styles.sectionTitle}>LCR Information</ThemedText>
              <LcrTextInput label="LCR Number" value={form.lcr_number} onChangeText={(value) => updateField('lcr_number', value)} autoCapitalize="characters" />
              <LcrTextInput label="Date of Registration" value={form.date_of_registration} onChangeText={(value) => updateField('date_of_registration', value)} placeholder="YYYY-MM-DD" />
            </Card>

            <Card style={styles.formSectionCard}>
              <ThemedText type="default" style={styles.sectionTitle}>Child Information</ThemedText>
              <LcrTextInput label="Full Name of Child" value={form.name_of_child} onChangeText={(value) => updateField('name_of_child', value.toUpperCase())} />
              <LcrTextInput label="Sex" value={form.sex} onChangeText={(value) => updateField('sex', value)} placeholder="Male / Female" />
              <LcrTextInput label="Date of Birth" value={form.date_of_birth} onChangeText={(value) => updateField('date_of_birth', value)} placeholder="YYYY-MM-DD" />
              <LcrTextInput label="Place of Birth" value={form.place_of_birth} onChangeText={(value) => updateField('place_of_birth', value.toUpperCase())} />
              <LcrTextInput label="Type of Birth" value={form.type_of_birth} onChangeText={(value) => updateField('type_of_birth', value.toUpperCase())} placeholder="Single / Twin / Triplet" />
              <LcrTextInput label="Order" value={form.order} onChangeText={(value) => updateField('order', value.toUpperCase())} placeholder="1st / 2nd / 3rd" />
            </Card>

            <Card style={styles.formSectionCard}>
              <ThemedText type="default" style={styles.sectionTitle}>Mother Information</ThemedText>
              <LcrTextInput label="Name of Mother" value={form.mother_name} onChangeText={(value) => updateField('mother_name', value.toUpperCase())} />
              <LcrTextInput label="Age" value={form.mother_age} onChangeText={(value) => updateField('mother_age', value)} keyboardType="numeric" />
              <LcrTextInput label="Nationality" value={form.mother_nationality} onChangeText={(value) => updateField('mother_nationality', value.toUpperCase())} />
              <LcrTextInput label="Religion" value={form.mother_religion} onChangeText={(value) => updateField('mother_religion', value.toUpperCase())} />
            </Card>

            <Card style={styles.formSectionCard}>
              <ThemedText type="default" style={styles.sectionTitle}>Father Information</ThemedText>
              <LcrTextInput label="Name of Father" value={form.father_name} onChangeText={(value) => updateField('father_name', value.toUpperCase())} />
              <LcrTextInput label="Age" value={form.father_age} onChangeText={(value) => updateField('father_age', value)} keyboardType="numeric" />
              <LcrTextInput label="Nationality" value={form.father_nationality} onChangeText={(value) => updateField('father_nationality', value.toUpperCase())} />
              <LcrTextInput label="Religion" value={form.father_religion} onChangeText={(value) => updateField('father_religion', value.toUpperCase())} />
            </Card>

            <Card style={styles.formSectionCard}>
              <ThemedText type="default" style={styles.sectionTitle}>Municipality / Province</ThemedText>
              <LcrTextInput label="Municipality / Province" value={form.municipality_province} onChangeText={(value) => updateField('municipality_province', value.toUpperCase())} />
            </Card>

            <Card style={styles.formSectionCard}>
              <ThemedText type="default" style={styles.sectionTitle}>Remarks</ThemedText>
              <LcrTextInput label="Remarks" value={form.remarks} onChangeText={(value) => updateField('remarks', value.toUpperCase())} multiline numberOfLines={4} style={styles.textAreaInput} />
            </Card>

            {error ? <ThemedText style={styles.formError}>{error}</ThemedText> : null}
          </ScrollView>

          <View style={styles.modalActions}>
            <Button title="Cancel" variant="secondary" onPress={handleClose} style={styles.modalButton} />
            <Button title={submitting ? 'Saving...' : 'Save Birth Record'} onPress={handleSubmit} isLoading={submitting} style={styles.modalButton} />
          </View>
        </View>
      </View>
    </Modal>
  );
}

// ─── Record Card ──────────────────────────────────────────────────────────────
function RecordCard({ record }: { record: UnifiedRecord }) {
  const theme = useTheme();
  const router = useRouter();
  const [zoomVisible, setZoomVisible] = useState(false);

  const displayName = record.name_of_child || record.name_of_deceased || record.name || 'Unnamed Record';
  const displayLcr = record.lcr_number || record.serial_number;
  const rawDate = record.date_of_birth || record.date_of_death || record.date || record.created_at;

  let formattedDate = '—';
  if (rawDate) {
    const d = new Date(rawDate);
    if (!isNaN(d.getTime())) {
      formattedDate = d.toLocaleDateString(undefined, {
        year: 'numeric', month: 'short', day: 'numeric',
      });
    }
  }

  const isBirth = record.record_type === 'birth';
  const isDeath = record.record_type === 'death';
  const badgeColor = isBirth ? '#34C759' : isDeath ? '#FF3B30' : '#007AFF';
  const badgeLabel = isBirth ? 'Birth' : isDeath ? 'Death' : (record.category || 'General');

  return (
    <>
      {record.imageUrl && (
        <ImageZoomModal
          uri={record.imageUrl}
          visible={zoomVisible}
          onClose={() => setZoomVisible(false)}
        />
      )}

      <TouchableOpacity
        onPress={() => router.push(`/(main)/search` as any)}
        activeOpacity={0.85}
      >
        <Card style={[styles.recordCard, { borderColor: theme.backgroundSelected }]}>
          {/* Thumbnail */}
          <TouchableOpacity
            onPress={(e) => {
              e.stopPropagation();
              if (record.imageUrl) setZoomVisible(true);
            }}
            activeOpacity={0.8}
            style={styles.thumbnailWrapper}
          >
            {record.imageUrl ? (
              <Image source={{ uri: record.imageUrl }} style={styles.thumbnail} />
            ) : (
              <View style={[styles.thumbnailPlaceholder, { backgroundColor: theme.backgroundSelected }]}>
                <FileText color={theme.textSecondary} size={28} />
              </View>
            )}
            {record.imageUrl && (
              <View style={styles.zoomBadge}>
                <ThemedText style={styles.zoomBadgeText}>🔍</ThemedText>
              </View>
            )}
          </TouchableOpacity>

          {/* Info */}
          <View style={styles.recordInfo}>
            <ThemedText numberOfLines={1} style={styles.recordName}>{displayName}</ThemedText>
            {displayLcr ? (
              <ThemedText style={[styles.recordMeta, { color: theme.textSecondary }]}>
                LCR / SN: {displayLcr}
              </ThemedText>
            ) : null}
            <View style={[styles.categoryBadge, { backgroundColor: badgeColor + '22' }]}>
              <ThemedText style={[styles.categoryText, { color: badgeColor }]}>{badgeLabel}</ThemedText>
            </View>
            <ThemedText style={[styles.recordDate, { color: theme.textSecondary }]}>
              {formattedDate}
            </ThemedText>
          </View>
        </Card>
      </TouchableOpacity>
    </>
  );
}

// ─── Dashboard Screen ─────────────────────────────────────────────────────────
export default function DashboardScreen() {
  const theme = useTheme();
  const [isBirthModalVisible, setIsBirthModalVisible] = useState(false);

  const {
    data: stats,
    isLoading: statsLoading,
    isError: statsError,
    refetch: refetchStats,
    isRefetching,
  } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/api/stats');
      return response.data;
    },
  });

  const { data: recentData, isLoading: recordsLoading, refetch: refetchRecords } = useQuery({
    queryKey: ['recent-records'],
    queryFn: async () => {
      const response = await api.get('/api/search?limit=20');
      return response.data.records as UnifiedRecord[];
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchRecords();
  };

  const handleBirthSaved = () => {
    refetchStats();
    refetchRecords();
  };

  const records = recentData ?? [];
  const isLoading = statsLoading || recordsLoading;
  const totalRecords   = Number(stats?.totalRecords  ?? 0);
  const birthRecords   = Number(stats?.birthRecords  ?? 0);
  const deathRecords   = Number(stats?.deathRecords  ?? 0);
  const todayRecords   = Number(stats?.todayRecords  ?? 0);
  const serverStatusText = statsLoading ? 'Connecting…' : statsError ? 'Offline' : (stats?.syncStatus ?? 'Online');
  const isServerConnected = !statsLoading && !statsError && !!stats;

  return (
    <>
      <BirthRegistrationModal
        visible={isBirthModalVisible}
        onClose={() => setIsBirthModalVisible(false)}
        onSaved={handleBirthSaved}
      />

      <ScrollView
        style={[styles.container, { backgroundColor: theme.background }]}
        refreshControl={
          <RefreshControl refreshing={isRefetching} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <ThemedText type="title">Dashboard</ThemedText>
          <ThemedText type="subtitle" style={{ color: theme.textSecondary }}>
            Registry Records
          </ThemedText>
        </View>

        <Card style={styles.actionCard}>
          <ThemedText type="default" style={styles.sectionTitle}>Quick Actions</ThemedText>
          <View style={styles.actionStack}>
            <Button
              title="Register Birth Record"
              onPress={() => setIsBirthModalVisible(true)}
              style={styles.actionButton}
            />
            <Button
              title="Register Death Record"
              variant="secondary"
              onPress={() => undefined}
              disabled
              style={[styles.actionButton, styles.disabledActionButton]}
            />
          </View>
        </Card>

        {/* Total Records — full width with breakdown */}
        <Card style={styles.totalCard}>
          <View style={styles.totalCardTop}>
            <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
              <Database color="#007AFF" size={24} />
            </View>
            <View style={{ marginLeft: 14 }}>
              <ThemedText style={styles.statValue}>
                {isLoading ? '…' : totalRecords}
              </ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Records</ThemedText>
            </View>
          </View>

          {/* Divider */}
          <View style={[styles.divider, { backgroundColor: theme.backgroundSelected }]} />

          {/* Breakdown row */}
          <View style={styles.breakdownRow}>
            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#34C759' }]} />
              <ThemedText style={styles.breakdownCount}>
                {isLoading ? '…' : birthRecords}
              </ThemedText>
              <ThemedText type="small" style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                Birth
              </ThemedText>
            </View>

            <View style={[styles.verticalDivider, { backgroundColor: theme.backgroundSelected }]} />

            <View style={styles.breakdownItem}>
              <View style={[styles.breakdownDot, { backgroundColor: '#FF3B30' }]} />
              <ThemedText style={styles.breakdownCount}>
                {isLoading ? '…' : deathRecords}
              </ThemedText>
              <ThemedText type="small" style={[styles.breakdownLabel, { color: theme.textSecondary }]}>
                Death
              </ThemedText>
            </View>
          </View>
        </Card>

        {/* Today's Uploads — full width */}
        <Card style={styles.todayCard}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
            <UploadCloud color="#FF9500" size={24} />
          </View>
          <ThemedText style={styles.statValue}>
            {isLoading ? '…' : todayRecords}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Today's Uploads</ThemedText>
        </Card>

        <Card style={styles.statusCard}> 
          <View style={styles.statusRow}>
            <View>
              <ThemedText type="default" style={{ fontWeight: '600' }}>Server Status</ThemedText>
              <ThemedText type="small" style={{ color: theme.textSecondary }}>
                {serverStatusText}
              </ThemedText>
            </View>
            <CheckCircle color={isServerConnected ? '#34C759' : '#FF3B30'} size={32} />
          </View>
        </Card>

        {/* Recent Records */}
        <View style={styles.sectionHeader}>
          <ThemedText type="default" style={styles.sectionTitle}>Recently Uploaded</ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>
            {records.length} records
          </ThemedText>
        </View>

        {recordsLoading ? (
          <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
            Loading records…
          </ThemedText>
        ) : records.length === 0 ? (
          <Card style={styles.emptyCard}>
            <FileText color={theme.textSecondary} size={40} />
            <ThemedText style={[styles.emptyText, { color: theme.textSecondary }]}>
              No records yet.{'\n'}Tap "Add Record" to upload your first document.
            </ThemedText>
          </Card>
        ) : (
          records.map((record) => (
            <RecordCard key={`${record.record_type || 'rec'}-${record.id}`} record={record} />
          ))
        )}

        <View style={{ height: 32 }} />
      </ScrollView>
    </>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: {
    flex: 1,
    padding: 16,
  },
  header: {
    marginBottom: 24,
  },
  totalCard: {
    marginBottom: 8,
    padding: 18,
  },
  totalCardTop: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  divider: {
    height: 1,
    marginVertical: 14,
    borderRadius: 1,
  },
  breakdownRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  breakdownItem: {
    flex: 1,
    alignItems: 'center',
    gap: 4,
  },
  verticalDivider: {
    width: 1,
    height: 40,
    borderRadius: 1,
  },
  breakdownDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  breakdownCount: {
    fontSize: 22,
    fontWeight: '700',
  },
  breakdownLabel: {
    fontSize: 12,
  },
  todayCard: {
    alignItems: 'center',
    padding: 20,
    marginBottom: 8,
  },
  iconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 10,
  },
  statValue: {
    fontSize: 28,
    fontWeight: '700',
    marginBottom: 4,
  },
  statusCard: {
    marginTop: 8,
    marginBottom: 8,
  },
  statusRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
  },
  sectionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginTop: 20,
    marginBottom: 12,
  },
  actionCard: {
    marginBottom: 16,
    padding: 16,
  },
  actionStack: {
    gap: 10,
    marginTop: 12,
  },
  actionButton: {
    width: '100%',
  },
  disabledActionButton: {
    opacity: 0.55,
  },
  sectionTitle: {
    fontSize: 16,
    fontWeight: '700',
  },
  recordCard: {
    flexDirection: 'row',
    padding: 0,
    marginBottom: 10,
    overflow: 'hidden',
    borderWidth: 0.5,
  },
  thumbnailWrapper: {
    width: 90,
    height: 90,
    position: 'relative',
  },
  thumbnail: {
    width: 90,
    height: 90,
    resizeMode: 'cover',
  },
  thumbnailPlaceholder: {
    width: 90,
    height: 90,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomBadge: {
    position: 'absolute',
    bottom: 4,
    right: 4,
    backgroundColor: 'rgba(0,0,0,0.5)',
    borderRadius: 8,
    paddingHorizontal: 4,
    paddingVertical: 1,
  },
  zoomBadgeText: {
    fontSize: 11,
  },
  recordInfo: {
    flex: 1,
    padding: 12,
    justifyContent: 'center',
  },
  recordName: {
    fontSize: 14,
    fontWeight: '700',
    marginBottom: 3,
  },
  recordMeta: {
    fontSize: 12,
    marginBottom: 4,
  },
  categoryBadge: {
    alignSelf: 'flex-start',
    borderRadius: 6,
    paddingHorizontal: 8,
    paddingVertical: 2,
    marginBottom: 4,
  },
  categoryText: {
    fontSize: 11,
    fontWeight: '600',
  },
  recordDate: {
    fontSize: 11,
  },
  emptyCard: {
    alignItems: 'center',
    paddingVertical: 40,
    gap: 12,
  },
  emptyText: {
    textAlign: 'center',
    fontSize: 14,
    lineHeight: 22,
  },
  // Modal
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.92)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT,
    justifyContent: 'center',
    alignItems: 'center',
  },
  zoomedImage: {
    width: SCREEN_WIDTH,
    height: SCREEN_HEIGHT * 0.85,
  },
  closeButton: {
    position: 'absolute',
    top: 52,
    right: 20,
    backgroundColor: 'rgba(255,255,255,0.15)',
    borderRadius: 20,
    padding: 8,
  },
  modalBackdrop: {
    flex: 1,
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
    padding: 16,
  },
  birthModalCard: {
    maxHeight: '92%',
    borderRadius: 18,
    padding: 16,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 10 },
    shadowOpacity: 0.2,
    shadowRadius: 18,
    elevation: 10,
  },
  modalHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  modalTitle: {
    fontSize: 24,
    fontWeight: '700',
  },
  closeIconWrap: {
    width: 36,
    height: 36,
    borderRadius: 18,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(150,150,150,0.12)',
  },
  formScroll: {
    maxHeight: SCREEN_HEIGHT * 0.64,
  },
  formSectionCard: {
    padding: 14,
    marginBottom: 12,
  },
  textAreaInput: {
    minHeight: 90,
    textAlignVertical: 'top',
    paddingTop: 12,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 10,
    marginTop: 16,
  },
  modalButton: {
    flex: 1,
  },
  formError: {
    color: '#FF3B30',
    marginTop: 8,
    marginBottom: 4,
    fontSize: 13,
  },
});
