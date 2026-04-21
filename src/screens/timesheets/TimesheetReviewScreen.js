import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot, updateDoc, doc } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const STATUS_COLORS = { pending: '#f59e0b', approved: '#16a34a', rejected: '#dc2626' }

export default function TimesheetReviewScreen() {
  const navigation = useNavigation()
  const [userRole, setUserRole] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [timesheets, setTimesheets] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const { getDoc, doc: docRef } = require('firebase/firestore')
        const userDoc = await getDoc(docRef(db, 'users', user.uid))
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
    const q = query(collection(db, 'timesheets'), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setTimesheets(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId, userRole])

  const handleReview = async (tsId, status) => {
    try {
      await updateDoc(doc(db, 'timesheets', tsId), { status, updatedAt: new Date().toISOString() })
      Alert.alert('Updated', `Timesheet ${status}.`)
    } catch (err) { Alert.alert('Error', err.message) }
  }

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  if (userRole !== 'admin' && userRole !== 'supervisor') {
    return <View style={styles.accessDenied}><Text style={styles.accessText}>Access denied. Supervisors only.</Text></View>
  }

  const pending = timesheets.filter(t => t.status === 'pending')

  const renderItem = ({ item }) => (
    <View style={styles.card}>
      <View style={styles.cardTop}>
        <View>
          <Text style={styles.userName}>{item.userName || item.userId}</Text>
          <Text style={styles.dateText}>{formatDate(item.clockIn)}</Text>
          <Text style={styles.projectText}>{item.projectName || 'No project'}{item.workType ? ` · ${item.workType}` : ''}</Text>
        </View>
        <View style={styles.hoursBlock}>
          <Text style={styles.hoursValue}>{item.hoursWorked ? item.hoursWorked.toFixed(1) : '--'}</Text>
          <Text style={styles.hoursLabel}>hours</Text>
        </View>
      </View>
      {item.status === 'pending' && (
        <View style={styles.reviewRow}>
          <TouchableOpacity style={[styles.reviewBtn, styles.rejectBtn]}
            onPress={() => handleReview(item.id, 'rejected')}>
            <Ionicons name="close" size={18} color="#dc2626" />
            <Text style={styles.rejectText}>Reject</Text>
          </TouchableOpacity>
          <TouchableOpacity style={[styles.reviewBtn, styles.approveBtn]}
            onPress={() => handleReview(item.id, 'approved')}>
            <Ionicons name="checkmark" size={18} color="#16a34a" />
            <Text style={styles.approveText}>Approve</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  )

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Review Timesheets</Text>
        <View style={{ width: 40 }} />
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : pending.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="checkmark-circle-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>All caught up</Text>
          <Text style={styles.emptySub}>No pending timesheets to review.</Text>
        </View>
      ) : (
        <FlatList data={pending} keyExtractor={item => item.id} renderItem={renderItem}
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
  cardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'flex-start' },
  userName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  dateText: { fontSize: 13, color: '#888', marginTop: 2 },
  projectText: { fontSize: 13, color: '#666', marginTop: 4 },
  hoursBlock: { alignItems: 'flex-end' },
  hoursValue: { fontSize: 22, fontWeight: 'bold', color: '#2563eb' },
  hoursLabel: { fontSize: 11, color: '#888' },
  reviewRow: { flexDirection: 'row', gap: 10, marginTop: 14, borderTopWidth: 1, borderTopColor: '#f0f0f0', paddingTop: 14 },
  reviewBtn: { flex: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 6, paddingVertical: 10, borderRadius: 8, borderWidth: 1 },
  rejectBtn: { borderColor: '#dc2626', backgroundColor: '#fef2f2' },
  rejectText: { fontSize: 14, color: '#dc2626', fontWeight: '600' },
  approveBtn: { borderColor: '#16a34a', backgroundColor: '#f0fdf4' },
  approveText: { fontSize: 14, color: '#16a34a', fontWeight: '600' },
  accessDenied: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: '#fff' },
  accessText: { fontSize: 16, color: '#888' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})