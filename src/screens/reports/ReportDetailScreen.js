import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, ActivityIndicator } from 'react-native'
import { useNavigation, useRoute } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { doc, getDoc } from 'firebase/firestore'
import { db } from '../../firebase.config'

export default function ReportDetailScreen({ navigation, route }) {
  const { reportId } = route.params
  const [report, setReport] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const load = async () => {
      const snap = await getDoc(doc(db, 'dailyReports', reportId))
      if (snap.exists()) setReport({ id: snap.id, ...snap.data() })
      setLoading(false)
    }
    load()
  }, [reportId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' })
  }

  const FieldRow = ({ label, value }) => value ? (
    <View style={styles.fieldRow}>
      <Text style={styles.fieldLabel}>{label}</Text>
      <Text style={styles.fieldValue}>{value}</Text>
    </View>
  ) : null

  if (loading) return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  if (!report) return <View style={styles.loading}><Text>Report not found</Text></View>

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>Daily Report</Text>
        {report.locked && (
          <View style={styles.lockedBadge}>
            <Ionicons name="lock-closed" size={14} color="#16a34a" />
            <Text style={styles.lockedText}>Locked</Text>
          </View>
        )}
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <View style={styles.dateCard}>
          <Text style={styles.dateText}>{formatDate(report.date)}</Text>
          {report.projectName && <Text style={styles.projectName}>{report.projectName}</Text>}
        </View>

        <View style={styles.metaCard}>
          <View style={styles.metaRow}>
            <Ionicons name="person-outline" size={16} color="#888" />
            <Text style={styles.metaText}>Submitted by: {report.submittedByName || 'Unknown'}</Text>
          </View>
          <View style={styles.metaRow}>
            <Ionicons name="people-outline" size={16} color="#888" />
            <Text style={styles.metaText}>Crew on site: {report.crewOnSite || 0}</Text>
          </View>
        </View>

        <FieldRow label="Work Completed" value={report.workCompleted} />
        <FieldRow label="Equipment Used" value={report.equipmentUsed} />
        <FieldRow label="Weather Conditions" value={report.weather} />
        <FieldRow label="Delays or Issues" value={report.delays} />
        <FieldRow label="Additional Notes" value={report.notes} />
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
  lockedBadge: { flexDirection: 'row', alignItems: 'center', gap: 4, backgroundColor: '#f0fdf4', paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  lockedText: { fontSize: 12, color: '#16a34a', fontWeight: '500' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  dateCard: { backgroundColor: '#2563eb', borderRadius: 12, padding: 20, marginBottom: 16 },
  dateText: { fontSize: 18, fontWeight: 'bold', color: '#fff' },
  projectName: { fontSize: 14, color: '#bfdbfe', marginTop: 4 },
  metaCard: { backgroundColor: '#f5f5f5', borderRadius: 12, padding: 16, marginBottom: 20, gap: 8 },
  metaRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  metaText: { fontSize: 14, color: '#666' },
  fieldRow: { marginBottom: 16 },
  fieldLabel: { fontSize: 12, fontWeight: '700', color: '#888', textTransform: 'uppercase', marginBottom: 4 },
  fieldValue: { fontSize: 15, color: '#333', lineHeight: 22 }
})