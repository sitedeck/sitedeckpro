import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const STATUS_COLORS = { available: '#16a34a', 'checked-out': '#f59e0b', maintenance: '#dc2626' }

export default function EquipmentListScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [equipment, setEquipment] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', user.uid))
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
    const q = query(collection(db, 'equipment'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setEquipment(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId])

  const filtered = equipment.filter(e =>
    !search || (e.name && e.name.toLowerCase().includes(search.toLowerCase())) ||
    (e.identifier && e.identifier.toLowerCase().includes(search.toLowerCase()))
  )

  const renderItem = ({ item }) => (
    <TouchableOpacity style={styles.card}
      onPress={() => navigation.navigate('EquipmentDetail', { equipmentId: item.id })}>
      <View style={styles.cardTop}>
        <Text style={styles.cardTitle}>{item.name || 'Unnamed'}</Text>
        <View style={[styles.statusBadge, { backgroundColor: (STATUS_COLORS[item.status] || '#888') + '20' }]}>
          <Text style={[styles.statusText, { color: STATUS_COLORS[item.status] || '#888' }]}>
            {item.status || 'available'}
          </Text>
        </View>
      </View>
      {item.type && <Text style={styles.cardSub}>{item.type}</Text>}
      {item.identifier && <Text style={styles.cardMeta}>ID: {item.identifier}</Text>}
      {item.assignedToName && (
        <View style={styles.assignedRow}>
          <Ionicons name="person-outline" size={14} color="#f59e0b" />
          <Text style={styles.assignedText}>{item.assignedToName} · {item.assignedProject || ''}</Text>
        </View>
      )}
    </TouchableOpacity>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Equipment</Text>
        {userRole === 'admin' && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddEquipment')}>
            <Ionicons name="add" size={24} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      <View style={styles.searchContainer}>
        <Ionicons name="search" size={18} color="#888" style={{ marginRight: 8 }} />
        <TextInput style={styles.searchInput} placeholder="Search equipment..." value={search}
          onChangeText={setSearch} placeholderTextColor="#888" />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : filtered.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="construct-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No equipment</Text>
          <Text style={styles.emptySub}>Equipment added by admins will appear here.</Text>
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 4 },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  statusBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 4 },
  statusText: { fontSize: 11, fontWeight: '600' },
  cardSub: { fontSize: 14, color: '#666', marginTop: 2 },
  cardMeta: { fontSize: 12, color: '#888', marginTop: 2 },
  assignedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 6 },
  assignedText: { fontSize: 13, color: '#f59e0b' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})