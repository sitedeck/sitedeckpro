import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_TIMESHEETS } from '../../constants/collections'
import { TIMESHEET_PENDING } from '../../constants/statuses'

const STATUS_COLORS = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626' }

export default function TimesheetHistoryScreen() {
  const navigation = useNavigation()
  const [userId, setUserId] = useState(null)
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const q = query(collection(db, COL_TIMESHEETS), where('userId', '==', user.uid), orderBy('createdAt', 'desc'))
        const unsub = onSnapshot(q, snap => {
          setTimesheets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          setLoading(false)
        })
        return () => unsub()
      }
    })
    return () => unsubscribe()
  }, [])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { weekday: 'short', month: 'short', day: 'numeric' })
  }

  const formatTime = (iso) => new Date(iso).toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <Text style={styles.cardDate}>{formatDate(item.clockIn)}</Text>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || '#888') + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || '#888' }]}>{item.status || TIMESHEET_PENDING}</Text>
        </View>
      </View>
      <View style={styles.timeRow}>
        <View style={styles.timeBlock}>
          <Ionicons name="log-in-outline" size={14} color="#16a34a" />
          <Text style={styles.timeText}>{item.clockIn ? formatTime(item.clockIn) : '--:--'}</Text>
        </View>
        <View style={styles.timeBlock}>
          <Ionicons name="log-out-outline" size={14} color="#dc2626" />
          <Text style={styles.timeText}>{item.clockOut ? formatTime(item.clockOut) : '--:--'}</Text>
        </View>
        <View style={styles.hoursBlock}>
          <Text style={styles.hoursValue}>{item.hoursWorked ? item.hoursWorked.toFixed(1) : '--'}</Text>
          <Text style={styles.hoursLabel}>hours</Text>
        </View>
      </View>
      <Text style={styles.projectText}>{item.projectName || 'No project'} {item.workType ? `· ${item.workType}` : ''}</Text>
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Timesheet History</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : timesheets.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="time-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No timesheets yet</Text>
          <Text style={styles.emptySub}>Clock in to start tracking time.</Text>
        </View>
      ) : (
        <FlatList data={timesheets} keyExtractor={item => item.id} renderItem={renderItem}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, backgroundColor: '#fff' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  cardDate: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  timeRow: { flexDirection: 'row', alignItems: 'center', gap: 20, marginBottom: 8 },
  timeBlock: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  timeText: { fontSize: 14, color: '#666' },
  hoursBlock: { marginLeft: 'auto', alignItems: 'flex-end' },
  hoursValue: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  hoursLabel: { fontSize: 11, color: '#888' },
  projectText: { fontSize: 13, color: '#888' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})