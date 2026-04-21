import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const getDaysLeft = (expiry) => {
  if (!expiry) return 999
  return Math.ceil((new Date(expiry) - new Date()) / 86400000)
}

const getColor = (days) => {
  if (days < 0) return { color: '#dc2626', bg: '#fef2f2' }
  if (days <= 30) return { color: '#f59e0b', bg: '#fffbeb' }
  return { color: '#16a34a', bg: '#f0fdf4' }
}

export default function AdminCertScreen() {
  const navigation = useNavigation()
  const [userRole, setUserRole] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [certs, setCerts] = useState([])
  const [filter, setFilter] = useState('All')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role)
          setOrgId(userDoc.data().orgId)
        }
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!orgId || (userRole !== 'admin' && userRole !== 'supervisor')) return
    const q = query(collection(db, 'certifications'), where('orgId', '==', orgId))
    const unsub = onSnapshot(q, snap => {
      setCerts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId, userRole])

  const filtered = certs.filter(c => {
    const days = getDaysLeft(c.expiryDate)
    if (filter === 'Valid') return days > 30
    if (filter === 'Expiring') return days >= 0 && days <= 30
    if (filter === 'Expired') return days < 0
    return true
  })

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  if (userRole !== 'admin' && userRole !== 'supervisor') {
    return <View style={styles.accessDenied}><Text style={styles.accessText}>Access denied.</Text></View>
  }

  const renderItem = ({ item }) => {
    const days = getDaysLeft(item.expiryDate)
    const { color, bg } = getColor(days)
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.certName}>{item.name}</Text>
          <Text style={styles.userName}>{item.userName || item.userId}</Text>
          <Text style={styles.certMeta}>Issued: {formatDate(item.issueDate)} · Expires: {formatDate(item.expiryDate)}</Text>
        </View>
        <View style={[styles.expiryBadge, { backgroundColor: bg }]}>
          <Text style={[styles.expiryDays, { color }]}>
            {days < 0 ? 'Expired' : days === 0 ? 'Today' : `${days}d`}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>All Certifications</Text>
        <View style={{ width: 40 }} />
      </View>
      <View style={styles.filterRow}>
        {['All', 'Valid', 'Expiring', 'Expired'].map(f => (
          <TouchableOpacity key={f} style={[styles.filterPill, filter === f && styles.filterPillActive]}
            onPress={() => setFilter(f)}>
            <Text style={[styles.filterText, filter === f && styles.filterTextActive]}>{f}</Text>
          </TouchableOpacity>
        ))}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="ribbon-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No certifications</Text>
        </View>
      ) : (
        <FlatList data={filtered} keyExtractor={item => item.id} renderItem={renderItem}
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
  filterRow: { flexDirection: 'row', paddingHorizontal: 16, paddingVertical: 12, gap: 8, backgroundColor: '#fff' },
  filterPill: { paddingHorizontal: 16, paddingVertical: 6, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb' },
  filterPillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  filterText: { fontSize: 13, color: '#666' },
  filterTextActive: { color: '#fff', fontWeight: '600' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  certName: { fontSize: 15, fontWeight: '600', color: '#1a1a1a' },
  userName: { fontSize: 13, color: '#2563eb', fontWeight: '500', marginTop: 2 },
  certMeta: { fontSize: 12, color: '#888', marginTop: 4 },
  expiryBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  expiryDays: { fontSize: 12, fontWeight: '600' },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  accessText: { fontSize: 16, color: '#888' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 }
})