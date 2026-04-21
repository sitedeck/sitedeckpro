import React, { useState, useEffect, useCallback } from 'react'
import {
  View, Text, StyleSheet, ScrollView, TouchableOpacity,
  RefreshControl, TextInput, ActivityIndicator, Dimensions
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const { width } = Dimensions.get('window')

const CATEGORY_TILES = ['Engineering', 'Execution', 'Project Quality', 'Safety']
const WORK_AREA_TILES = ['Substation', 'BESS', 'Collection', 'TLine']

const SEVERITY_COLORS = {
  Low: '#3b82f6',
  Medium: '#f59e0b',
  High: '#f97316',
  Critical: '#dc2626'
}

const STATUS_COLORS = {
  Open: '#dc2626',
  Reviewed: '#2563eb',
  Closed: '#16a34a'
}

export default function HomeScreen() {
  const navigation = useNavigation()
  const [user, setUser] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [lessons, setLessons] = useState([])
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (firebaseUser) {
        setUser(firebaseUser)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', firebaseUser.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          setUserRole(userDoc.data().role)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!orgId) return
    const q = query(
      collection(db, 'lessons'),
      where('orgId', '==', orgId),
      orderBy('createdAt', 'desc')
    )
    const unsub = onSnapshot(q, (snap) => {
      setLessons(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
      setRefreshing(false)
    })
    return () => unsub()
  }, [orgId])

  const onRefresh = useCallback(() => setRefreshing(true), [])

  const getCategoryCount = (category) =>
    lessons.filter(l => l.category === category && l.status === 'Open').length

  const getWorkAreaCount = (area) =>
    lessons.filter(l => l.workArea === area && l.status === 'Open').length

  const recentLessons = lessons.slice(0, 4)

  // Chart data
  const openCount = lessons.filter(l => l.status === 'Open').length
  const reviewedCount = lessons.filter(l => l.status === 'Reviewed').length
  const closedCount = lessons.filter(l => l.status === 'Closed').length
  const criticalCount = lessons.filter(l => l.severity === 'Critical').length

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.logoText}>SiteDeck Pro</Text>
        <View style={styles.headerRight}>
          {userRole === 'admin' && (
            <TouchableOpacity style={styles.headerBtn}>
              <Ionicons name="settings-outline" size={22} color="#1a1a1a" />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        refreshControl={<RefreshControl refreshing={refreshing} onRefresh={onRefresh} />}
        showsVerticalScrollIndicator={false}
      >
        {loading ? (
          <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
        ) : (
          <>
            {/* Stats Row */}
            <View style={styles.statsRow}>
              <View style={[styles.statCard, { borderLeftColor: '#dc2626' }]}>
                <Text style={styles.statNumber}>{openCount}</Text>
                <Text style={styles.statLabel}>Open</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#2563eb' }]}>
                <Text style={styles.statNumber}>{reviewedCount}</Text>
                <Text style={styles.statLabel}>Reviewed</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#16a34a' }]}>
                <Text style={styles.statNumber}>{closedCount}</Text>
                <Text style={styles.statLabel}>Closed</Text>
              </View>
              <View style={[styles.statCard, { borderLeftColor: '#dc2626' }]}>
                <Text style={[styles.statNumber, { color: '#dc2626' }]}>{criticalCount}</Text>
                <Text style={styles.statLabel}>Critical</Text>
              </View>
            </View>

            {/* Category Tiles Row 1 */}
            <Text style={styles.sectionLabel}>Categories</Text>
            <View style={styles.tileRow}>
              {CATEGORY_TILES.map(cat => (
                <TouchableOpacity
                  key={cat}
                  style={styles.tile}
                  onPress={() => navigation.navigate('Lessons', { filterCategory: cat })}
                >
                  <Text style={styles.tileCount}>{getCategoryCount(cat)}</Text>
                  <Text style={styles.tileLabel}>{cat}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Work Area Tiles Row 2 */}
            <Text style={styles.sectionLabel}>Work Areas</Text>
            <View style={styles.tileRow}>
              {WORK_AREA_TILES.map(area => (
                <TouchableOpacity
                  key={area}
                  style={[styles.tile, styles.tileSecondary]}
                  onPress={() => navigation.navigate('Lessons', { filterWorkArea: area })}
                >
                  <Text style={[styles.tileCount, { color: '#fff' }]}>{getWorkAreaCount(area)}</Text>
                  <Text style={[styles.tileLabel, { color: '#fff' }]}>{area}</Text>
                </TouchableOpacity>
              ))}
            </View>

            {/* Recent Lessons */}
            <Text style={styles.sectionLabel}>Recent Lessons</Text>
            {recentLessons.length === 0 ? (
              <View style={styles.emptyState}>
                <Text style={styles.emptyText}>No lessons yet</Text>
              </View>
            ) : (
              recentLessons.map(lesson => (
                <TouchableOpacity
                  key={lesson.id}
                  style={styles.lessonCard}
                  onPress={() => navigation.navigate('LessonDetail', { lessonId: lesson.id })}
                >
                  <View style={styles.lessonCardTop}>
                    <Text style={styles.lessonTitle} numberOfLines={1}>{lesson.title}</Text>
                    <View style={[styles.badge, { backgroundColor: SEVERITY_COLORS[lesson.severity] || '#888' }]}>
                      <Text style={styles.badgeText}>{lesson.severity || 'Low'}</Text>
                    </View>
                  </View>
                  <View style={styles.lessonCardMeta}>
                    <View style={styles.metaPill}>
                      <View style={[styles.dot, { backgroundColor: '#9333ea' }]} />
                      <Text style={styles.metaText}>{lesson.category || 'General'}</Text>
                    </View>
                    <View style={styles.metaPill}>
                      <View style={[styles.dot, { backgroundColor: '#0891b2' }]} />
                      <Text style={styles.metaText}>{lesson.workArea || 'General'}</Text>
                    </View>
                    <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[lesson.status] || '#888') + '20' }]}>
                      <Text style={[styles.statusText, { color: STATUS_COLORS[lesson.status] || '#888' }]}>
                        {lesson.status || 'Open'}
                      </Text>
                    </View>
                  </View>
                  <Text style={styles.lessonDate}>{formatDate(lesson.createdAt)}</Text>
                </TouchableOpacity>
              ))
            )}

            <View style={{ height: 80 }} />
          </>
        )}
      </ScrollView>

      {/* Floating Mic Button */}
      <TouchableOpacity
        style={styles.fab}
        onPress={() => navigation.navigate('NewLesson')}
      >
        <Ionicons name="mic" size={28} color="#fff" />
      </TouchableOpacity>
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
    paddingBottom: 12,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#eee'
  },
  logoText: { fontSize: 20, fontWeight: 'bold', color: '#2563eb' },
  headerRight: { flexDirection: 'row', gap: 8 },
  headerBtn: { padding: 6 },
  scrollView: { flex: 1 },
  statsRow: { flexDirection: 'row', paddingHorizontal: 16, paddingTop: 16, gap: 10 },
  statCard: {
    flex: 1, backgroundColor: '#fff', borderRadius: 12, padding: 12,
    borderLeftWidth: 3, borderWidth: 1, borderColor: '#e5e7eb'
  },
  statNumber: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  statLabel: { fontSize: 11, color: '#888', marginTop: 2 },
  sectionLabel: {
    fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase',
    marginTop: 20, marginBottom: 10, marginHorizontal: 20
  },
  tileRow: { flexDirection: 'row', flexWrap: 'wrap', paddingHorizontal: 16, gap: 10 },
  tile: {
    flex: 1, minWidth: (width - 52) / 2, backgroundColor: '#fff',
    borderRadius: 12, padding: 16, alignItems: 'center', borderWidth: 1, borderColor: '#e5e7eb'
  },
  tileSecondary: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  tileCount: { fontSize: 28, fontWeight: 'bold', color: '#2563eb' },
  tileLabel: { fontSize: 12, color: '#666', marginTop: 4, textAlign: 'center' },
  lessonCard: {
    backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10,
    marginHorizontal: 20, borderWidth: 1, borderColor: '#e5e7eb'
  },
  lessonCardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  lessonTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  lessonCardMeta: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 6 },
  metaPill: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  dot: { width: 8, height: 8, borderRadius: 4 },
  metaText: { fontSize: 13, color: '#666' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  lessonDate: { fontSize: 12, color: '#999' },
  emptyState: { padding: 40, alignItems: 'center' },
  emptyText: { color: '#888', fontSize: 15 },
  fab: {
    position: 'absolute', bottom: 24, right: 24, width: 60, height: 60,
    borderRadius: 30, backgroundColor: '#f59e0b', justifyContent: 'center',
    alignItems: 'center', elevation: 6,
    shadowColor: '#000', shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.25, shadowRadius: 4
  }
})