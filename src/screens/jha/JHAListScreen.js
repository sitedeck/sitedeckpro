import React, { useState, useEffect } from 'react'
import {
  View, Text, StyleSheet, FlatList, TouchableOpacity,
  TextInput, ActivityIndicator
} from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_JHA, COL_USERS } from '../../constants/collections'
import { JHA_DRAFT } from '../../constants/statuses'

const STATUS_COLORS = { Draft: '#f59e0b', Submitted: '#2563eb', Approved: '#16a34a', Rejected: '#dc2626' }

export default function JHAListScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [jhas, setJhas] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, COL_USERS, user.uid))
        if (userDoc.exists()) setOrgId(userDoc.data().orgId)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    if (!orgId) return
    const q = query(collection(db, COL_JHA), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, (snap) => {
      setJhas(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filtered = jhas.filter(j =>
    !search || (j.description && j.description.toLowerCase().includes(search.toLowerCase()))
  )

  const renderItem = ({ item }) => (
    <TouchableOpacity
      style={styles.card}
      onPress={() => navigation.navigate('JHADetail', { jhaId: item.id })}
    >
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={2}>{item.description || 'Untitled JHA'}</Text>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[item.status] || '#888') + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[item.status] || '#888' }]}>
            {item.status || JHA_DRAFT}
          </Text>
        </View>
      </View>
      {item.projectName && (
        <View style={styles.metaRow}>
          <Ionicons name="folder-outline" size={14} color="#666" />
          <Text style={styles.metaText}>{item.projectName}</Text>
        </View>
      )}
      {item.supervisorName && (
        <View style={styles.metaRow}>
          <Ionicons name="person-outline" size={14} color="#666" />
          <Text style={styles.metaText}>Supervisor: {item.supervisorName}</Text>
        </View>
      )}
      <Text style={styles.cardDate}>{formatDate(item.createdAt)}</Text>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Job Hazard Analysis</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewJHA')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search JHAs..." value={search}
          onChangeText={setSearch} placeholderTextColor="#888" />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No JHAs yet</Text>
          <Text style={styles.emptySub}>Tap + to create your first JHA.</Text>
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
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  addBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  searchContainer: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', marginHorizontal: 16, marginTop: 12, borderRadius: 8, paddingHorizontal: 12, borderWidth: 1, borderColor: '#e5e7eb' },
  searchInput: { flex: 1, paddingVertical: 10, fontSize: 15, color: '#1a1a1a' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 8 },
  cardTitle: { fontSize: 15, fontWeight: '600', color: '#1a1a1a', flex: 1, marginRight: 8 },
  badge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  badgeText: { fontSize: 11, fontWeight: '600' },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginBottom: 4 },
  metaText: { fontSize: 13, color: '#666' },
  cardDate: { fontSize: 12, color: '#999', marginTop: 4 },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})