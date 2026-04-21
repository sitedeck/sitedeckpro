import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const STATUS_COLORS = { Draft: '#f59e0b', Submitted: '#2563eb', Approved: '#16a34a', Rejected: '#dc2626' }
const RISK_COLORS = { Low: '#3b82f6', Medium: '#f59e0b', High: '#dc2626' }

export default function JHADetailScreen({ navigation, route }) {
  const { jhaId } = route.params
  const [jha, setJha] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [userId, setUserId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) setUserRole(userDoc.data().role)
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'jha', jhaId))
      if (snap.exists()) setJha({ id: snap.id, ...snap.data() })
      setLoading(false)
    }
    load()
  }, [jhaId])

  const handleApprove = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'jha', jhaId), { status: 'Approved', updatedAt: new Date().toISOString() })
      await addDoc(collection(db, 'activityFeed'), {
        orgId: jha.orgId, type: 'jha_approved', jhaId, userId, userName: jha.createdByName || 'Unknown',
        message: `JHA approved by ${userRole}`, createdAt: new Date().toISOString(), updatedAt: new Date().toISOString()
      })
      const snap = await getDoc(doc(db, 'jha', jhaId))
      setJha({ id: snap.id, ...snap.data() })
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  const handleSignOff = async () => {
    if (!jha.crewSignoffs) jha.crewSignoffs = []
    const existing = jha.crewSignoffs.find(s => s.userId === userId)
    if (existing) { Alert.alert('Already Signed', 'You have already signed off on this JHA.'); return }
    const newSignoffs = [...jha.crewSignoffs, { userId, signedAt: new Date().toISOString() }]
    await updateDoc(doc(db, 'jha', jhaId), { crewSignoffs: newSignoffs, updatedAt: new Date().toISOString() })
    const snap = await getDoc(doc(db, 'jha', jhaId))
    setJha({ id: snap.id, ...snap.data() })
    Alert.alert('Signed', 'Your acknowledgment has been recorded.')
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  if (!jha) return <View style={styles.loading}><Text>JHA not found</Text></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>JHA Detail</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={[styles.badge, { backgroundColor: (STATUS_COLORS[jha.status] || '#888') + '20' }]}>
          <Text style={[styles.badgeText, { color: STATUS_COLORS[jha.status] || '#888' }]}>{jha.status || 'Draft'}</Text>
        </View>

        <Text style={styles.sectionLabel}>Work Description</Text>
        <Text style={styles.bodyText}>{jha.description}</Text>

        {jha.location && <>
          <Text style={styles.sectionLabel}>Location</Text>
          <Text style={styles.bodyText}>{jha.location}</Text>
        </>}

        <Text style={styles.sectionLabel}>Hazards ({jha.hazards?.length || 0})</Text>
        {jha.hazards?.map((h, i) => (
          <View key={i} style={styles.hazardCard}>
            <View style={styles.hazardTop}>
              <Text style={styles.hazardTitle}>Hazard {i + 1}</Text>
              <View style={[styles.riskBadge, { backgroundColor: RISK_COLORS[h.riskLevel] || '#888' }]}>
                <Text style={styles.riskText}>{h.riskLevel}</Text>
              </View>
            </View>
            <Text style={styles.hazardDesc}>{h.description}</Text>
            {h.mitigation && <Text style={styles.hazardMitigation}>Control: {h.mitigation}</Text>}
          </View>
        ))}

        <Text style={styles.sectionLabel}>PPE Required</Text>
        <View style={styles.ppeRow}>
          {jha.ppeList?.map((p, i) => (
            <View key={i} style={styles.ppeChip}><Ionicons name="checkmark-circle" size={14} color="#16a34a" /><Text style={styles.ppeChipText}>{p}</Text></View>
          )) || <Text style={styles.bodyText}>None specified</Text>}
        </View>

        <Text style={styles.sectionLabel}>Crew Sign-Off ({jha.crewSignoffs?.length || 0}/{jha.crewSignoffs?.length || '?'})</Text>
        {jha.crewSignoffs?.map((s, i) => (
          <View key={i} style={styles.signoffRow}>
            <Ionicons name="checkmark-circle" size={18} color="#16a34a" />
            <Text style={styles.signoffText}>Acknowledged {new Date(s.signedAt).toLocaleString()}</Text>
          </View>
        )) || <Text style={styles.bodyText}>No sign-offs yet</Text>}

        {jha.status === 'Draft' && userRole !== 'crew' && (
          <TouchableOpacity style={[styles.approveBtn, saving && styles.approveBtnDisabled]}
            onPress={handleApprove} disabled={saving}>
            {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.approveText}>Approve JHA</Text>}
          </TouchableOpacity>
        )}

        {jha.status !== 'Approved' && jha.crewSignoffs?.every(s => s.userId !== userId) && (
          <TouchableOpacity style={styles.signOffBtn} onPress={handleSignOff}>
            <Text style={styles.signOffText}>I Acknowledge and Sign Off</Text>
          </TouchableOpacity>
        )}
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  badge: { alignSelf: 'flex-start', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 6, marginBottom: 16 },
  badgeText: { fontSize: 13, fontWeight: '600' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginTop: 16, marginBottom: 6 },
  bodyText: { fontSize: 15, color: '#333', lineHeight: 22 },
  hazardCard: { backgroundColor: '#f5f5f5', borderRadius: 10, padding: 14, marginBottom: 10 },
  hazardTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 6 },
  hazardTitle: { fontSize: 13, fontWeight: '600', color: '#333' },
  riskBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4 },
  riskText: { color: '#fff', fontSize: 11, fontWeight: '600' },
  hazardDesc: { fontSize: 14, color: '#444', marginBottom: 4 },
  hazardMitigation: { fontSize: 13, color: '#16a34a', fontStyle: 'italic' },
  ppeRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  ppeChip: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 10, paddingVertical: 4, borderRadius: 12 },
  ppeChipText: { fontSize: 13, color: '#16a34a' },
  signoffRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  signoffText: { fontSize: 14, color: '#16a34a' },
  approveBtn: { backgroundColor: '#16a34a', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 24 },
  approveBtnDisabled: { backgroundColor: '#86efac' },
  approveText: { color: '#fff', fontSize: 16, fontWeight: '600' },
  signOffBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 16 },
  signOffText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})