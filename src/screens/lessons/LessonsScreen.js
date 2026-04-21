import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const SEVERITY_COLORS = { Low: '#3b82f6', Medium: '#f59e0b', High: '#f97316', Critical: '#dc2626' }
const STATUS_COLORS = { Open: '#dc2626', Reviewed: '#2563eb', Closed: '#16a34a' }
const FILTER_PILLS = ['All', 'Open', 'Reviewed', 'Closed']
const CATEGORY_COLORS = {
  Engineering: '#9333ea',
  Execution: '#2563eb',
  'Project Quality': '#16a34a',
  Safety: '#dc2626'
}
const WORK_AREA_COLORS = {
  Substation: '#0891b2',
  BESS: '#f59e0b',
  Collection: '#7c3aed',
  TLine: '#059669'
}

export default function LessonsScreen() {
  const navigation = useNavigation()
  const route = useRoute()
  const [orgId, setOrgId] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [filter, setFilter] = useState('All')
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) setOrgId(userDoc.data().orgId)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!orgId) return

    let q = query(collection(db, 'lessons'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      let data = snap.docs.map(d => ({ id: d.id, ...d.data() }))

      // Apply route filters
      if (route.params?.filterCategory) {
        data = data.filter(l => l.category === route.params.filterCategory)
      }
      if (route.params?.filterWorkArea) {
        data = data.filter(l => l.workArea === route.params.filterWorkArea)
      }

      setLessons(data)
      setLoading(false)
    })
    return () => unsub()
  }, [orgId, route.params])

  const filtered = lessons.filter(l => {
    const matchFilter = filter === 'All' || l.status === filter
    const matchSearch = !search ||
      (l.title && l.title.toLowerCase().includes(search.toLowerCase())) ||
      (l.description && l.description.toLowerCase().includes(search.toLowerCase()))
    return matchFilter && matchSearch
  })

  const formatDate = (iso) => {
    if (!iso) return ''
    const d = new Date(iso)
    return d.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('LessonDetail', { lessonId: item.id })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.title || 'Untitled'}</Text>
        <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[item.severity] || '#888' }]}>
          <Text style={styles.badgeText}>{item.severity || 'Low'}</Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaPill}>
          <View style={[styles.dot, { backgroundColor: CATEGORY_COLORS[item.category] || '#888' }]} />
          <Text style={styles.metaText}>{item.category || 'General'}</Text>
        </View>
        <View style={styles.metaPill}>
          <View style={[styles.dot, { backgroundColor: WORK_AREA_COLORS[item.workArea] || '#888' }]} />
          <Text style={styles.metaText}>{item.workArea || 'General'}</Text>
        </View>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#888') + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#888' }]}>
            {item.status || 'Open'}
          </Text>
        </View>
      </View>
      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Lessons</Text>
        <TouchableOpacity
          style={styles.addBtn}
          onPress={() => navigation.navigate('NewLesson')}
        >
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput
          style={styles.searchInput}
          placeholder="Search title or description..."
          value={search}
          onChangeText={setSearch}
          placeholderTextColor="#888"
        />
      </View>

      {/* Filter Pills */}
      <View style={styles.filterRow}>
        {FILTER_PILLS.map(p => (
          <TouchableOpacity
            key={p}
            style={[styles.filterPill, filter === p && styles.filterPillActive]}
            onPress={() => setFilter(p)}
          >
            <Text style={[styles.filterText, filter === p && styles.filterTextActive]}>
              {p}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No lessons yet</Text>
          <Text style={styles.emptySub}>Tap + to add your first lesson.</Text>
        </View>
      ) : (
        <FlatList
          data={filtered}
          keyExtractor={item => item.id}
          renderItem={renderItem}
          contentContainerStyle={styles.list}
          showsVerticalScrollIndicator={false}
        />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingTop: 56,
    paddingHorizontal: 20,
    paddingBottom: 16,
    backgroundColor: '#fff'
  },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  addBtn: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: '#2563eb',
    justifyContent: 'center',
    alignItems: 'center'
  },
  searchContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#fff',
    marginHorizontal: 16,
    marginTop: 12,
    borderRadius: 8,
    paddingHorizontal: 12,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#1a1a1a' },
  filterRow: {
    flexDirection: 'row',
    paddingHorizontal: 16,
    paddingVertical: 12,
    gap: 8
  },
  filterPill: {
    paddingHorizontal: 16,
    paddingVertical: 6,
    borderRadius: 20,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  filterPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: '#e5e7eb'
  },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  cardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 13, color: '#666' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardDate: { fontSize: 12, color: '#999' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})