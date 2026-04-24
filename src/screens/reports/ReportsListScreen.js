import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_DAILY_REPORTS, COL_USERS } from '../../constants/collections'

export default function ReportsListScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [reports, setReports] = useState([])
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
    const q = query(collection(db, COL_DAILY_REPORTS), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setReports(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const filtered = reports.filter(r =>
    !search || (r.projectName && r.projectName.toLowerCase().includes(search.toLowerCase()))
  )

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}
      onPress={() => navigation.navigate('ReportDetail', { reportId: item.id })}>
      <View style={styles.cardTop}>
        <View style={styles.dateBlock}>
          <Text style={styles.dateDay}>{new Date(item.date).getDate()}</Text>
          <Text style={styles.dateMonth}>{new Date(item.date).toLocaleString('en-US', { month: 'short' })}</Text>
        </View>
        <View style={{ flex: 1, marginLeft: 14 }}>
          <Text style={styles.cardTitle}>{item.projectName || 'Unknown Project'}</Text>
          <Text style={styles.cardSub}>Submitted by {item.submittedByName || 'Unknown'}</Text>
          <Text style={styles.cardMeta}>Crew: {item.crewOnSite || 0}</Text>
        </View>
        {item.locked && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={12} color="#16a34a" />
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Daily Reports</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('NewReport')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search by project..." value={search}
          onChangeText={setSearch} placeholderTextColor="#888" />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="document-text-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No daily reports</Text>
          <Text style={styles.emptySub}>Tap + to create your first report.</Text>
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
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  dateBlock: { width: 44, height: 44, borderRadius: 8, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  dateDay: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  dateMonth: { fontSize: 10, color: '#fff', textTransform: 'uppercase' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  cardSub: { fontSize: 13, color: '#666', marginTop: 2 },
  cardMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  lockedText: { fontSize: 11, color: '#16a34a', fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})