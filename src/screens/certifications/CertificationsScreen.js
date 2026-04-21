import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const CERT_OPTIONS = ['OSHA 10', 'OSHA 30', 'First Aid/CPR', 'Equipment Operator', 'Confined Space', 'Fall Protection', 'Electrical Safety', 'Custom']

const getExpiryColor = (daysLeft) => {
  if (daysLeft < 0) return '#dc2626'
  if (daysLeft <= 30) return '#f59e0b'
  return '#16a34a'
}

const getExpiryBg = (daysLeft) => {
  if (daysLeft < 0) return '#fef2f2'
  if (daysLeft <= 30) return '#fffbeb'
  return '#f0fdf4'
}

export default function CertificationsScreen() {
  const navigation = useNavigation()
  const [userId, setUserId] = useState(null)
  const [certs, setCerts] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const q = query(collection(db, 'certifications'), where('userId', '==', user.uid))
        const unsub = onSnapshot(q, snap => {
          setCerts(snap.docs.map(d => ({ id: d.id, ...d.data() })))
          setLoading(false)
        })
        return () => unsub()
      }
    })
    return () => unsubscribe()
  }, [])

  const getDaysLeft = (expiry) => {
    if (!expiry) return 999
    return Math.ceil((new Date(expiry) - new Date()) / 86400000)
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderItem = ({ item }) => {
    const daysLeft = getDaysLeft(item.expiryDate)
    const color = getExpiryColor(daysLeft)
    const bg = getExpiryBg(daysLeft)
    return (
      <View style={styles.card}>
        <View style={styles.cardLeft}>
          <Text style={styles.certName}>{item.name}</Text>
          <Text style={styles.certMeta}>Issued: {formatDate(item.issueDate)}</Text>
          <Text style={styles.certMeta}>Expires: {formatDate(item.expiryDate)}</Text>
          {item.certNumber && <Text style={styles.certMeta}>#{item.certNumber}</Text>}
        </View>
        <View style={[styles.expiryBadge, { backgroundColor: bg }]}>
          <Text style={[styles.expiryDays, { color }]}>
            {daysLeft < 0 ? 'Expired' : daysLeft === 0 ? 'Expires today' : `${daysLeft}d left`}
          </Text>
        </View>
      </View>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>My Certifications</Text>
        <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('AddCert')}>
          <Ionicons name="add" size={24} color="#fff" />
        </TouchableOpacity>
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : certs.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="ribbon-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No certifications</Text>
          <Text style={styles.emptySub}>Tap + to add your first cert.</Text>
        </View>
      ) : (
        <FlatList data={certs} keyExtractor={item => item.id} renderItem={renderItem}
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
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb', flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardLeft: { flex: 1 },
  certName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 4 },
  certMeta: { fontSize: 13, color: '#888', marginTop: 2 },
  expiryBadge: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  expiryDays: { fontSize: 12, fontWeight: '600' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})