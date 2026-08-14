import { ThemedText } from '@/components/themed-text';
import { Card } from '@/components/ui/Card';
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
interface Record {
  id: number;
  name: string;
  serial_number: string;
  category: string;
  date: string;
  imageUrl: string | null;
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

// ─── Record Card ──────────────────────────────────────────────────────────────
function RecordCard({ record }: { record: Record }) {
  const theme = useTheme();
  const router = useRouter();
  const [zoomVisible, setZoomVisible] = useState(false);

  const formattedDate = new Date(record.date).toLocaleDateString(undefined, {
    year: 'numeric', month: 'short', day: 'numeric',
  });

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
        onPress={() => router.push(`/(main)/record/${record.id}` as any)}
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
            <ThemedText numberOfLines={1} style={styles.recordName}>{record.name}</ThemedText>
            {record.serial_number ? (
              <ThemedText style={[styles.recordMeta, { color: theme.textSecondary }]}>
                SN: {record.serial_number}
              </ThemedText>
            ) : null}
            {record.category ? (
              <View style={[styles.categoryBadge, { backgroundColor: 'rgba(0,122,255,0.12)' }]}>
                <ThemedText style={styles.categoryText}>{record.category}</ThemedText>
              </View>
            ) : null}
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

  const { data: stats, isLoading: statsLoading, refetch: refetchStats, isRefetching } = useQuery({
    queryKey: ['dashboard-stats'],
    queryFn: async () => {
      const response = await api.get('/api/stats');
      return response.data;
    },
  });

  const { data: recentData, isLoading: recordsLoading, refetch: refetchRecords } = useQuery({
    queryKey: ['recent-records'],
    queryFn: async () => {
      const response = await api.get('/api/records?limit=20');
      return response.data.records as Record[];
    },
  });

  const handleRefresh = () => {
    refetchStats();
    refetchRecords();
  };

  const records = recentData ?? [];
  const isLoading = statsLoading || recordsLoading;

  return (
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

      {/* Stats row */}
      <View style={styles.grid}>
        <Card style={[styles.statCard, { flex: 1, marginRight: 8 }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(0,122,255,0.1)' }]}>
            <Database color="#007AFF" size={24} />
          </View>
          <ThemedText style={styles.statValue}>
            {isLoading ? '…' : (stats?.totalRecords ?? 0)}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Total Records</ThemedText>
        </Card>

        <Card style={[styles.statCard, { flex: 1, marginLeft: 8 }]}>
          <View style={[styles.iconContainer, { backgroundColor: 'rgba(255,149,0,0.1)' }]}>
            <UploadCloud color="#FF9500" size={24} />
          </View>
          <ThemedText style={styles.statValue}>
            {isLoading ? '…' : (stats?.todayRecords ?? 0)}
          </ThemedText>
          <ThemedText type="small" style={{ color: theme.textSecondary }}>Today's Uploads</ThemedText>
        </Card>
      </View>

      <Card style={styles.statusCard}>
        <View style={styles.statusRow}>
          <View>
            <ThemedText type="default" style={{ fontWeight: '600' }}>Server Status</ThemedText>
            <ThemedText type="small" style={{ color: theme.textSecondary }}>
              {statsLoading ? 'Connecting…' : (stats ? '● Connected' : '✕ Unreachable')}
            </ThemedText>
          </View>
          <CheckCircle color={stats ? '#34C759' : '#FF3B30'} size={32} />
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
          <RecordCard key={record.id} record={record} />
        ))
      )}

      <View style={{ height: 32 }} />
    </ScrollView>
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
  grid: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  statCard: {
    alignItems: 'center',
    padding: 20,
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
    color: '#007AFF',
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
});
