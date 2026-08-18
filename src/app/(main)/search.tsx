import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
import { useTheme } from '@/hooks/use-theme';
import { api } from '@/services/api';
import { useQuery } from '@tanstack/react-query';
import { Search as SearchIcon, X } from 'lucide-react-native';
import { useMemo, useState } from 'react';
import {
  ActivityIndicator,
  FlatList,
  Modal,
  Pressable,
  ScrollView,
  StyleSheet,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';

// ─── Types ───────────────────────────────────────────────────────────────────
type RecordType = 'birth' | 'death';

interface BirthRecord {
  id: number;
  record_type: 'birth';
  lcr_number: string | null;
  date_of_registration: string | null;
  name_of_child: string;
  sex: string | null;
  date_of_birth: string | null;
  place_of_birth: string | null;
  type_of_birth: string | null;
  order: string | null;
  mother_name: string | null;
  mother_age: string | null;
  mother_nationality: string | null;
  mother_religion: string | null;
  father_name: string | null;
  father_age: string | null;
  father_nationality: string | null;
  father_religion: string | null;
  municipality_province: string | null;
  remarks: string | null;
  created_at: string | null;
}

interface DeathRecord {
  id: number;
  record_type: 'death';
  lcr_number: string | null;
  date_of_registration: string | null;
  name_of_deceased: string;
  sex: string | null;
  date_of_death: string | null;
  place_of_death: string | null;
  cause_of_death: string | null;
  age_at_death: string | null;
  civil_status: string | null;
  nationality: string | null;
  religion: string | null;
  occupation: string | null;
  mother_name: string | null;
  father_name: string | null;
  informant_name: string | null;
  informant_relationship: string | null;
  remarks: string | null;
  created_at: string | null;
}

type UnifiedRecord = BirthRecord | DeathRecord;

// ─── Helpers ─────────────────────────────────────────────────────────────────
function getDisplayName(r: UnifiedRecord) {
  return r.record_type === 'birth' ? r.name_of_child : r.name_of_deceased;
}

function formatDate(val: string | null | undefined) {
  if (!val) return '—';
  const d = new Date(val);
  return isNaN(d.getTime()) ? val : d.toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' });
}

// ─── Detail Row ───────────────────────────────────────────────────────────────
function DetailRow({ label, value }: { label: string; value: string | null | undefined }) {
  if (!value) return null;
  return (
    <View style={detailStyles.row}>
      <ThemedText style={detailStyles.label}>{label}</ThemedText>
      <ThemedText style={detailStyles.value}>{value}</ThemedText>
    </View>
  );
}

function SectionHeader({ title }: { title: string }) {
  return <ThemedText style={detailStyles.sectionHeader}>{title}</ThemedText>;
}

// ─── Record Detail Modal ──────────────────────────────────────────────────────
function RecordDetailModal({
  record,
  visible,
  onClose,
}: {
  record: UnifiedRecord | null;
  visible: boolean;
  onClose: () => void;
}) {
  const theme = useTheme();
  if (!record) return null;

  const isBirth = record.record_type === 'birth';
  const accentColor = isBirth ? '#34C759' : '#FF3B30';
  const typeLabel = isBirth ? 'Birth Record' : 'Death Record';

  return (
    <Modal visible={visible} animationType="slide" transparent onRequestClose={onClose}>
      <View style={[modalStyles.backdrop]}>
        <View style={[modalStyles.sheet, { backgroundColor: theme.background }]}>
          {/* Header */}
          <View style={[modalStyles.header, { borderBottomColor: theme.backgroundSelected }]}>
            <View style={[modalStyles.typeBadge, { backgroundColor: accentColor + '22' }]}>
              <ThemedText style={[modalStyles.typeBadgeText, { color: accentColor }]}>
                {typeLabel}
              </ThemedText>
            </View>
            <TouchableOpacity onPress={onClose} style={modalStyles.closeBtn}>
              <X color={theme.textSecondary} size={22} />
            </TouchableOpacity>
          </View>

          {/* Name */}
          <View style={modalStyles.nameRow}>
            <ThemedText style={modalStyles.nameText}>{getDisplayName(record)}</ThemedText>
            {record.lcr_number && (
              <ThemedText style={[modalStyles.lcrNumber, { color: theme.textSecondary }]}>
                LCR #{record.lcr_number}
              </ThemedText>
            )}
          </View>

          <ScrollView showsVerticalScrollIndicator={false} style={modalStyles.scrollBody}>
            {/* Registration */}
            <SectionHeader title="Registration" />
            <DetailRow label="Date Registered" value={formatDate(record.date_of_registration)} />

            {isBirth ? (
              // ── Birth fields ──
              <>
                <SectionHeader title="Child Information" />
                <DetailRow label="Sex" value={(record as BirthRecord).sex} />
                <DetailRow label="Date of Birth" value={formatDate((record as BirthRecord).date_of_birth)} />
                <DetailRow label="Place of Birth" value={(record as BirthRecord).place_of_birth} />
                <DetailRow label="Type of Birth" value={(record as BirthRecord).type_of_birth} />
                <DetailRow label="Order" value={(record as BirthRecord).order} />

                <SectionHeader title="Mother" />
                <DetailRow label="Name" value={(record as BirthRecord).mother_name} />
                <DetailRow label="Age" value={(record as BirthRecord).mother_age} />
                <DetailRow label="Nationality" value={(record as BirthRecord).mother_nationality} />
                <DetailRow label="Religion" value={(record as BirthRecord).mother_religion} />

                <SectionHeader title="Father" />
                <DetailRow label="Name" value={(record as BirthRecord).father_name} />
                <DetailRow label="Age" value={(record as BirthRecord).father_age} />
                <DetailRow label="Nationality" value={(record as BirthRecord).father_nationality} />
                <DetailRow label="Religion" value={(record as BirthRecord).father_religion} />

                <SectionHeader title="Location" />
                <DetailRow label="Municipality / Province" value={(record as BirthRecord).municipality_province} />
              </>
            ) : (
              // ── Death fields ──
              <>
                <SectionHeader title="Deceased Information" />
                <DetailRow label="Sex" value={(record as DeathRecord).sex} />
                <DetailRow label="Date of Death" value={formatDate((record as DeathRecord).date_of_death)} />
                <DetailRow label="Place of Death" value={(record as DeathRecord).place_of_death} />
                <DetailRow label="Cause of Death" value={(record as DeathRecord).cause_of_death} />
                <DetailRow label="Age at Death" value={(record as DeathRecord).age_at_death} />
                <DetailRow label="Civil Status" value={(record as DeathRecord).civil_status} />
                <DetailRow label="Nationality" value={(record as DeathRecord).nationality} />
                <DetailRow label="Religion" value={(record as DeathRecord).religion} />
                <DetailRow label="Occupation" value={(record as DeathRecord).occupation} />

                <SectionHeader title="Parents" />
                <DetailRow label="Mother" value={(record as DeathRecord).mother_name} />
                <DetailRow label="Father" value={(record as DeathRecord).father_name} />

                <SectionHeader title="Informant" />
                <DetailRow label="Name" value={(record as DeathRecord).informant_name} />
                <DetailRow label="Relationship" value={(record as DeathRecord).informant_relationship} />
              </>
            )}

            {record.remarks && (
              <>
                <SectionHeader title="Remarks" />
                <ThemedText style={detailStyles.remarks}>{record.remarks}</ThemedText>
              </>
            )}

            <View style={{ height: 32 }} />
          </ScrollView>
        </View>
      </View>
    </Modal>
  );
}

// ─── Record List Item ─────────────────────────────────────────────────────────
function RecordItem({ record, onPress }: { record: UnifiedRecord; onPress: () => void }) {
  const theme = useTheme();
  const isBirth = record.record_type === 'birth';
  const accentColor = isBirth ? '#34C759' : '#FF3B30';
  const dateValue = isBirth
    ? (record as BirthRecord).date_of_birth
    : (record as DeathRecord).date_of_death;

  return (
    <TouchableOpacity onPress={onPress} activeOpacity={0.8}>
      <Card style={[listStyles.card, { borderLeftColor: accentColor }]}>
        <View style={listStyles.cardInner}>
          <View style={[listStyles.dot, { backgroundColor: accentColor }]} />
          <View style={listStyles.info}>
            <ThemedText style={listStyles.name} numberOfLines={1}>
              {getDisplayName(record)}
            </ThemedText>
            <View style={listStyles.meta}>
              <View style={[listStyles.badge, { backgroundColor: accentColor + '22' }]}>
                <ThemedText style={[listStyles.badgeText, { color: accentColor }]}>
                  {isBirth ? 'Birth' : 'Death'}
                </ThemedText>
              </View>
              {record.lcr_number && (
                <ThemedText style={[listStyles.sub, { color: theme.textSecondary }]}>
                  LCR #{record.lcr_number}
                </ThemedText>
              )}
              {dateValue && (
                <ThemedText style={[listStyles.sub, { color: theme.textSecondary }]}>
                  {formatDate(dateValue)}
                </ThemedText>
              )}
            </View>
          </View>
        </View>
      </Card>
    </TouchableOpacity>
  );
}

// ─── Search Screen ────────────────────────────────────────────────────────────
export default function SearchScreen() {
  const theme = useTheme();
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<UnifiedRecord | null>(null);

  // Load ALL records on mount — no query param
  const { data, isLoading, isError } = useQuery({
    queryKey: ['all-records'],
    queryFn: async () => {
      const res = await api.get('/api/search');
      return res.data.records as UnifiedRecord[];
    },
    staleTime: 30_000,
  });

  // Client-side filter as user types
  const filtered = useMemo(() => {
    const all = data ?? [];
    if (!query.trim()) return all;
    const q = query.toLowerCase();
    return all.filter((r) => {
      const name = getDisplayName(r).toLowerCase();
      const lcr = (r.lcr_number ?? '').toLowerCase();
      return name.includes(q) || lcr.includes(q);
    });
  }, [data, query]);

  return (
    <View style={[styles.container, { backgroundColor: theme.background }]}>
      {/* Search bar */}
      <View style={[styles.searchBar, { backgroundColor: theme.backgroundSelected }]}>
        <SearchIcon color={theme.textSecondary} size={18} style={styles.searchIcon} />
        <TextInput
          style={[styles.input, { color: theme.text }]}
          placeholder="Search by name or LCR number…"
          placeholderTextColor={theme.textSecondary}
          value={query}
          onChangeText={setQuery}
          autoCorrect={false}
          returnKeyType="search"
        />
        {query.length > 0 && (
          <TouchableOpacity onPress={() => setQuery('')}>
            <X color={theme.textSecondary} size={16} />
          </TouchableOpacity>
        )}
      </View>

      {/* Count row */}
      {!isLoading && !isError && (
        <View style={styles.countRow}>
          <ThemedText style={[styles.countText, { color: theme.textSecondary }]}>
            {query ? `${filtered.length} result${filtered.length !== 1 ? 's' : ''}` : `${filtered.length} total records`}
          </ThemedText>
        </View>
      )}

      {/* States */}
      {isLoading && (
        <View style={styles.center}>
          <ActivityIndicator color="#007AFF" size="large" />
          <ThemedText style={[styles.centerText, { color: theme.textSecondary }]}>
            Loading records…
          </ThemedText>
        </View>
      )}

      {isError && (
        <View style={styles.center}>
          <ThemedText style={[styles.centerText, { color: '#FF3B30' }]}>
            Failed to load records.{'\n'}Check your connection and try again.
          </ThemedText>
        </View>
      )}

      {!isLoading && !isError && filtered.length === 0 && (
        <View style={styles.center}>
          <ThemedText style={[styles.centerText, { color: theme.textSecondary }]}>
            {query ? 'No records match your search.' : 'No records found.'}
          </ThemedText>
        </View>
      )}

      {/* List */}
      {!isLoading && !isError && (
        <FlatList
          data={filtered}
          keyExtractor={(item) => `${item.record_type}-${item.id}`}
          renderItem={({ item }) => (
            <RecordItem record={item} onPress={() => setSelected(item)} />
          )}
          contentContainerStyle={styles.list}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
        />
      )}

      {/* Detail Modal */}
      <RecordDetailModal
        record={selected}
        visible={!!selected}
        onClose={() => setSelected(null)}
      />
    </View>
  );
}

// ─── Styles ───────────────────────────────────────────────────────────────────
const styles = StyleSheet.create({
  container: { flex: 1, paddingTop: 16, paddingHorizontal: 16 },
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    borderRadius: 12,
    paddingHorizontal: 12,
    paddingVertical: 10,
    marginBottom: 8,
    gap: 8,
  },
  searchIcon: {},
  input: { flex: 1, fontSize: 15, paddingVertical: 0 },
  countRow: { marginBottom: 10, paddingHorizontal: 2 },
  countText: { fontSize: 12 },
  list: { paddingBottom: 32 },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 12 },
  centerText: { textAlign: 'center', fontSize: 14, lineHeight: 22 },
});

const listStyles = StyleSheet.create({
  card: {
    marginBottom: 10,
    padding: 0,
    borderLeftWidth: 3,
    overflow: 'hidden',
  },
  cardInner: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 14,
    gap: 12,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  info: { flex: 1, gap: 6 },
  name: { fontSize: 14, fontWeight: '700' },
  meta: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
  badge: { borderRadius: 6, paddingHorizontal: 7, paddingVertical: 2 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  sub: { fontSize: 12 },
});

const modalStyles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.5)',
    justifyContent: 'flex-end',
  },
  sheet: {
    borderTopLeftRadius: 24,
    borderTopRightRadius: 24,
    maxHeight: '92%',
    paddingBottom: 0,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.15,
    shadowRadius: 16,
    elevation: 12,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 20,
    paddingVertical: 16,
    borderBottomWidth: 0.5,
  },
  typeBadge: {
    borderRadius: 8,
    paddingHorizontal: 12,
    paddingVertical: 4,
  },
  typeBadgeText: { fontSize: 13, fontWeight: '700' },
  closeBtn: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: 'rgba(150,150,150,0.12)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  nameRow: { paddingHorizontal: 20, paddingVertical: 16 },
  nameText: { fontSize: 22, fontWeight: '800', marginBottom: 4 },
  lcrNumber: { fontSize: 13 },
  scrollBody: { paddingHorizontal: 20 },
});

const detailStyles = StyleSheet.create({
  sectionHeader: {
    fontSize: 12,
    fontWeight: '700',
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    color: '#007AFF',
    marginTop: 20,
    marginBottom: 8,
  },
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-start',
    paddingVertical: 7,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: 'rgba(150,150,150,0.15)',
  },
  label: { fontSize: 13, opacity: 0.6, flex: 1 },
  value: { fontSize: 13, fontWeight: '600', flex: 2, textAlign: 'right' },
  remarks: { fontSize: 13, lineHeight: 20, opacity: 0.8, marginTop: 4 },
});
