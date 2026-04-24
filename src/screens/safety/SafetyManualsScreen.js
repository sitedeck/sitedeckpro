import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_SAFETY_MANUALS } from '../../constants/collections'
import { ADMIN } from '../../constants/roles'
import * as DocumentPicker from 'expo-document-picker'

export default function SafetyManualsScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userId, setUserId] = useState(null)
  const [manuals, setManuals] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, COL_USERS, user.uid))
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
    const q = query(collection(db, COL_SAFETY_MANUALS), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setManuals(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })
  }

  const renderItem = ({ item }) => {
    const userAck = item.acknowledgments?.find(a => a.userId === userId)
    return (
      <TouchableOpacity style={styles.card}
        onPress={() => navigation.navigate('ManualViewer', { manualId: item.id })}>
        <View style={styles.cardTop}>
          <Ionicons name="document-text" size={24} color="#dc2626" />
          <View style={{ flex: 1, marginLeft: 12 }}>
            <Text style={styles.cardTitle}>{item.title}</Text>
            <Text style={styles.cardSub}>Uploaded {formatDate(item.createdAt)}</Text>
          </View>
          <View style={[styles.ackBadge, { backgroundColor: userAck ? '#f0fdf4' : '#fef3c7' }]}>
            <Ionicons name={userAck ? 'checkmark-circle' : 'time-outline'}
              size={18} color={userAck ? '#16a34a' : '#f59e0b'} />
            <Text style={[styles.ackText, { color: userAck ? '#16a34a' : '#f59e0b' }]}>
              {userAck ? 'Acknowledged' : 'Pending'}
            </Text>
          </View>
        </View>
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Safety Manuals</Text>
        {userRole === ADMIN && (
          <TouchableOpacity style={styles.uploadBtn} onPress={() => navigation.navigate('UploadManual')}>
            <Ionicons name="cloud-upload-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : manuals.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="shield-checkmark-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No safety manuals</Text>
          <Text style={styles.emptySub}>Manuals uploaded by admins will appear here.</Text>
        </View>
      ) : (
        <FlatList data={manuals} keyExtractor={item => item.id} renderItem={renderItem}
          contentContainerStyle={styles.list} showsVerticalScrollIndicator={false} />
      )}
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a' },
  uploadBtn: { width: 40, height: 40, borderRadius: 20, backgroundColor: '#2563eb', justifyContent: 'center', alignItems: 'center' },
  list: { paddingHorizontal: 16, paddingBottom: 100 },
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardTop: { flexDirection: 'row', alignItems: 'center' },
  cardTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  cardSub: { fontSize: 12, color: '#888', marginTop: 2 },
  ackBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 10, paddingVertical: 5, borderRadius: 12 },
  ackText: { fontSize: 12, fontWeight: '500' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})