import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Alert, ActivityIndicator, Linking } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc, updateDoc, arrayUnion } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

export default function ManualViewerScreen({ navigation, route }) {
  const { manualId } = route.params
  const [manual, setManual] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [acknowledged, setAcknowledged] = useState(false)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) setUserName(user.displayName || userDoc.data().name || 'Unknown')
      }
    })
    return () => unsubscribe()
  }, [])

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'safetyManuals', manualId))
      if (snap.exists()) {
        const data = { id: snap.id, ...snap.data() }
        setManual(data)
        setAcknowledged(data.acknowledgments?.some(a => a.userId === userId) || false)
      }
      setLoading(false)
    }
    load()
  }, [manualId, userId])

  const handleAcknowledge = async () => {
    setSaving(true)
    try {
      await updateDoc(doc(db, 'safetyManuals', manualId), {
        acknowledgments: arrayUnion({
          userId,
          userName,
          acknowledgedAt: new Date().toISOString()
        })
      })
      setAcknowledged(true)
      Alert.alert('Acknowledged', 'This manual has been acknowledged.')
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  if (!manual) return <View style={styles.loading}><Text>Manual not found</Text></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle} numberOfLines={1}>{manual.title}</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.pdfPreview}>
          <Ionicons name="document-text" size={64} color="#dc2626" />
          <Text style={styles.pdfName}>{manual.title}</Text>
          <Text style={styles.pdfHint}>Tap Open to view the full document</Text>
          {manual.fileUrl && (
            <TouchableOpacity style={styles.openBtn} onPress={() => Linking.openURL(manual.fileUrl)}>
              <Ionicons name="external-link-outline" size={18} color="#2563eb" />
              <Text style={styles.openBtnText}>Open PDF</Text>
            </TouchableOpacity>
          )}
        </View>

        <Text style={styles.sectionLabel}>Acknowledgment Status</Text>
        <View style={styles.ackSection}>
          {acknowledged ? (
            <View style={styles.ackConfirmed}>
              <Ionicons name="checkmark-circle" size={40} color="#16a34a" />
              <Text style={styles.ackConfirmedText}>You have acknowledged this manual</Text>
            </View>
          ) : (
            <TouchableOpacity style={[styles.ackBtn, saving && styles.ackBtnDisabled]}
              onPress={handleAcknowledge} disabled={saving}>
              {saving ? <ActivityIndicator color="#fff" /> : (
                <>
                  <Ionicons name="checkmark" size={20} color="#fff" />
                  <Text style={styles.ackBtnText}>Acknowledge & Sign Off</Text>
                </>
              )}
            </TouchableOpacity>
          )}
        </View>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 17, fontWeight: '600', color: '#1a1a1a', flex: 1, textAlign: 'center' },
  scrollView: { flex: 1 },
  content: { padding: 20 },
  pdfPreview: { alignItems: 'center', padding: 40, backgroundColor: '#f5f5f5', borderRadius: 16, marginBottom: 24 },
  pdfName: { fontSize: 16, fontWeight: '600', color: '#333', marginTop: 12, textAlign: 'center' },
  pdfHint: { fontSize: 13, color: '#888', marginTop: 4 },
  openBtn: { flexDirection: 'row', alignItems: 'center', gap: 6, marginTop: 16, paddingVertical: 10, paddingHorizontal: 20, backgroundColor: '#eff6ff', borderRadius: 8 },
  openBtnText: { fontSize: 14, color: '#2563eb', fontWeight: '500' },
  sectionLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 12 },
  ackSection: { marginBottom: 40 },
  ackConfirmed: { flexDirection: 'row', alignItems: 'center', gap: 12, backgroundColor: '#f0fdf4', padding: 20, borderRadius: 12 },
  ackConfirmedText: { fontSize: 16, color: '#16a34a', fontWeight: '500' },
  ackBtn: { flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 8, backgroundColor: '#16a34a', padding: 16, borderRadius: 8 },
  ackBtnDisabled: { backgroundColor: '#86efac' },
  ackBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})