import React, { useState } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'

const CERT_OPTIONS = ['OSHA 10', 'OSHA 30', 'First Aid/CPR', 'Equipment Operator', 'Confined Space', 'Fall Protection', 'Electrical Safety', 'Custom']

export default function AddCertScreen() {
  const navigation = useNavigation()
  const [userId, setUserId] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [selectedCert, setSelectedCert] = useState('')
  const [customName, setCustomName] = useState('')
  const [issueDate, setIssueDate] = useState('')
  const [expiryDate, setExpiryDate] = useState('')
  const [certNumber, setCertNumber] = useState('')
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, 'users', user.uid))
        if (userDoc.exists()) setOrgId(userDoc.data().orgId)
      }
    })
    return () => unsubscribe()
  }, [])

  const handleSubmit = async () => {
    const certName = selectedCert === 'Custom' ? customName.trim() : selectedCert
    if (!certName) { Alert.alert('Required', 'Please select or enter a certification name'); return }
    if (!issueDate) { Alert.alert('Required', 'Please enter the issue date'); return }
    if (!expiryDate) { Alert.alert('Required', 'Please enter the expiry date'); return }

    setSaving(true)
    try {
      await addDoc(collection(db, 'certifications'), {
        userId, orgId,
        name: certName,
        issueDate,
        expiryDate,
        certNumber: certNumber.trim() || null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      Alert.alert('Saved', 'Certification added.', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Add Certification</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Certification *</Text>
        <View style={styles.pillRow}>
          {CERT_OPTIONS.map(c => (
            <TouchableOpacity key={c} style={[styles.pill, selectedCert === c && styles.pillActive]}
              onPress={() => setSelectedCert(selectedCert === c ? '' : c)}>
              <Text style={[styles.pillText, selectedCert === c && styles.pillTextActive]}>{c}</Text>
            </TouchableOpacity>
          ))}
        </View>

        {selectedCert === 'Custom' && (
          <>
            <Text style={styles.label}>Certification Name *</Text>
            <TextInput style={styles.input} placeholder="Enter certification name"
              value={customName} onChangeText={setCustomName} />
          </>
        )}

        <Text style={styles.label}>Issue Date *</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={issueDate} onChangeText={setIssueDate} />

        <Text style={styles.label}>Expiry Date *</Text>
        <TextInput style={styles.input} placeholder="YYYY-MM-DD" value={expiryDate} onChangeText={setExpiryDate} />

        <Text style={styles.label}>Certificate Number (optional)</Text>
        <TextInput style={styles.input} placeholder="License or cert number" value={certNumber} onChangeText={setCertNumber} />

        <TouchableOpacity style={[styles.submitBtn, saving && styles.submitBtnDisabled]}
          onPress={handleSubmit} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.submitText}>Add Certification</Text>}
        </TouchableOpacity>
      </ScrollView>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fff' },
  header: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', paddingTop: 56, paddingHorizontal: 16, paddingBottom: 16, borderBottomWidth: 1, borderBottomColor: '#eee' },
  backBtn: { padding: 4 },
  headerTitle: { fontSize: 18, fontWeight: '600', color: '#1a1a1a' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  label: { fontSize: 13, fontWeight: '600', color: '#888', textTransform: 'uppercase', marginBottom: 8, marginTop: 16 },
  input: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a' },
  pillRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  pill: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb' },
  pillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  pillText: { fontSize: 14, color: '#333' },
  pillTextActive: { color: '#fff', fontWeight: '500' },
  submitBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  submitBtnDisabled: { backgroundColor: '#93c5fd' },
  submitText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})