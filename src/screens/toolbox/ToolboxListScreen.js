import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_TOOLBOX_TALKS, COL_USERS } from '../../constants/collections'
import { TOOLBOX_OPEN } from '../../constants/statuses'

export default function ToolboxListScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [talks, setTalks] = useState([])
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
    const q = query(collection(db, COL_TOOLBOX_TALKS), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setTalks(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filtered = talks.filter(t =>
    !search || (t.topic && t.topic.toLowerCase().includes(search.toLowerCase()))
  )

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}
      onPress={() => navigation.navigate('ToolboxDetail', { talkId: item.id })}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle} numberOfLines={1}>{item.topic || 'Untitled Talk'}</Text>
        <View style={[styles.lockedBadge, { backgroundColor: item.locked ? '#f0fdf4' : '#fef3c7' }]}>
          <Ionicons name={item.locked ? 'lock-closed' : 'lock-open-outline'} size={12}
            color={item.locked ? '#16a34a' : '#f59e0b'} />
          <Text style={[styles.lockedText, { color: item.locked ? '#16a34a' : '#f59e0b' }]}>
            {item.locked ? 'Locked' : TOOLBOX_OPEN}
          </Text>
        </View>
      </View>
      <View style={styles.cardMeta}>
        <View style={styles.metaItem}><Ionicons name="calendar-outline" size={14} color="#666" /><Text style={styles.metaText}>{formatDate(item.date)}</Text></View>
        <View style={styles.metaItem}><Ionicons name="person-outline" size={14} color="#666" /><Text style={styles.metaText}>{item.conductorName || 'Unknown'}</Text></View>
        <View style={styles.metaItem}><Ionicons name="people-outline" size={14} color="#666" /><Text style={styles.metaText}>{item.attendees?.length || 0} attendees</Text></View>
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Toolbox Talks</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewToolbox')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search topics..." value={search}
          onChangeText={setSearch} placeholderTextColor="#888" />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mic-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No toolbox talks</Text>
          <Text style={styles.emptySub}>Tap + to schedule your first talk.</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', flex: 1 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  lockedText: { fontSize: 11, fontWeight: '500' },
  cardMeta: { flexDirection: 'row', gap: 16 },
  metaItem: { flexDirection: 'row', alignItems: 'center', gap: 4 },
  metaText: { fontSize: 13, color: '#666' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})