import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, Modal, ActivityIndicator, Linking } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { doc, getDoc } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_USERS, COL_ORGANIZATIONS } from '../../constants/collections'
import { PLAN_CORE, PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE, PLAN_ORDER, PLAN_NAMES } from '../../constants/plans'

const TOOLS = [
  {
    key: 'jha',
    name: 'Job Hazard Analysis',
    description: 'Identify hazards before work begins',
    icon: 'shield-checkmark-outline',
    plans: [PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'JHAList'
  },
  {
    key: 'safety',
    name: 'Safety Manuals',
    description: 'View and acknowledge safety manuals',
    icon: 'document-text-outline',
    plans: [PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'SafetyManuals'
  },
  {
    key: 'toolbox',
    name: 'Toolbox Talks',
    description: 'Schedule and conduct safety talks',
    icon: 'mic-outline',
    plans: [PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'ToolboxList'
  },
  {
    key: 'reports',
    name: 'Daily Reports',
    description: 'Submit daily job site reports',
    icon: 'document-outline',
    plans: [PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'ReportsList'
  },
  {
    key: 'timesheets',
    name: 'Timesheets',
    description: 'Clock in/out and track hours',
    icon: 'time-outline',
    plans: [PLAN_FIELD, PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'Timesheet'
  },
  {
    key: 'certs',
    name: 'Certifications',
    description: 'Track employee certifications',
    icon: 'ribbon-outline',
    plans: [PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'Certifications'
  },
  {
    key: 'equipment',
    name: 'Equipment',
    description: 'Track and manage equipment',
    icon: 'construct-outline',
    plans: [PLAN_PREMIUM, PLAN_ENTERPRISE],
    screen: 'EquipmentList'
  }
]

export default function ToolsMenuScreen() {
  const navigation = useNavigation()
  const [orgPlan, setOrgPlan] = useState(null)
  const [orgId, setOrgId] = useState(null)
  const [loading, setLoading] = useState(true)
  const [showUpgradeModal, setShowUpgradeModal] = useState(false)
  const [lockedTool, setLockedTool] = useState(null)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        const userDoc = await getDoc(doc(db, COL_USERS, user.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          const orgDoc = await getDoc(doc(db, COL_ORGANIZATIONS, userDoc.data().orgId))
          if (orgDoc.exists()) {
            setOrgPlan(orgDoc.data().plan || PLAN_CORE)
          }
        }
        setLoading(false)
      }
    })
    return () => unsubscribe()
  }, [])

  const isUnlocked = (toolPlans) => {
    if (!orgPlan) return false
    const userPlanIdx = PLAN_ORDER.indexOf(orgPlan)
    return toolPlans.some(p => {
      const toolPlanIdx = PLAN_ORDER.indexOf(p)
      return toolPlanIdx <= userPlanIdx
    })
  }

  const handleToolPress = (tool) => {
    if (isUnlocked(tool.plans)) {
      navigation.navigate(tool.screen)
    } else {
      setLockedTool(tool)
      setShowUpgradeModal(true)
    }
  }

  if (loading) {
    return <View style={styles.loading}><ActivityIndicator size="large" color="#2563eb" /></View>
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Tools</Text>
        <View style={styles.planBadge}>
          <Text style={styles.planBadgeText}>{PLAN_NAMES[orgPlan] || 'Core'}</Text>
        </View>
      </View>

      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        {TOOLS.map(tool => {
          const unlocked = isUnlocked(tool.plans)
          return (
            <TouchableOpacity
              key={tool.key}
              style={[styles.toolCard, !unlocked && styles.toolCardLocked]}
              onPress={() => handleToolPress(tool)}
            >
              <View style={[styles.iconBox, { backgroundColor: unlocked ? '#eff6ff' : '#f5f5f5' }]}>
                <Ionicons
                  name={tool.icon}
                  size={24}
                  color={unlocked ? '#2563eb' : '#ccc'}
                />
              </View>
              <View style={styles.toolInfo}>
                <View style={styles.toolNameRow}>
                  <Text style={[styles.toolName, !unlocked && styles.toolNameLocked]}>{tool.name}</Text>
                  {!unlocked && <Ionicons name="lock-closed" size={14} color="#ccc" />}
                </View>
                <Text style={[styles.toolDesc, !unlocked && styles.toolDescLocked]}>{tool.description}</Text>
              </View>
              <Ionicons name="chevron-forward" size={18} color={unlocked ? '#ccc' : '#ddd'} />
            </TouchableOpacity>
          )
        })}
      </ScrollView>

      {/* Upgrade Modal */}
      <Modal visible={showUpgradeModal} transparent animationType="fade">
        <View style={styles.modalOverlay}>
          <View style={styles.modalCard}>
            <Ionicons name="lock-closed" size={48} color="#2563eb" />
            <Text style={styles.modalTitle}>Upgrade Required</Text>
            <Text style={styles.modalText}>
              {lockedTool?.name} is available on the{' '}
              {lockedTool?.plans.map(p => PLAN_NAMES[p]).join(', ')}{' '}
              plans.
            </Text>
            <Text style={styles.modalSub}>
              Contact us at support@sitedeck.pro to upgrade your plan.
            </Text>
            <TouchableOpacity
              style={styles.modalBtn}
              onPress={() => setShowUpgradeModal(false)}
            >
              <Text style={styles.modalBtnText}>Got It</Text>
            </TouchableOpacity>
          </View>
        </View>
      </Modal>
    </View>
  )
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5' },
  loading: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  header: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingTop: 56, paddingHorizontal: 20, paddingBottom: 16, backgroundColor: '#fff' },
  headerTitle: { fontSize: 22, fontWeight: 'bold', color: '#1a1a1a' },
  planBadge: { backgroundColor: '#eff6ff', paddingHorizontal: 12, paddingVertical: 4, borderRadius: 12 },
  planBadgeText: { fontSize: 13, color: '#2563eb', fontWeight: '600' },
  scrollView: { flex: 1 },
  content: { padding: 20, paddingBottom: 100 },
  toolCard: { flexDirection: 'row', alignItems: 'center', backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  toolCardLocked: { backgroundColor: '#fafafa' },
  iconBox: { width: 48, height: 48, borderRadius: 12, justifyContent: 'center', alignItems: 'center' },
  toolInfo: { flex: 1, marginLeft: 14 },
  toolNameRow: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  toolName: { fontSize: 16, fontWeight: '600', color: '#1a1a1a' },
  toolNameLocked: { color: '#aaa' },
  toolDesc: { fontSize: 13, color: '#888', marginTop: 2 },
  toolDescLocked: { color: '#ccc' },
  modalOverlay: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', alignItems: 'center', padding: 20 },
  modalCard: { backgroundColor: '#fff', borderRadius: 20, padding: 32, alignItems: 'center', width: '100%', maxWidth: 340 },
  modalTitle: { fontSize: 20, fontWeight: 'bold', color: '#1a1a1a', marginTop: 16, marginBottom: 8 },
  modalText: { fontSize: 15, color: '#444', textAlign: 'center', lineHeight: 22 },
  modalSub: { fontSize: 13, color: '#888', textAlign: 'center', marginTop: 8, marginBottom: 24 },
  modalBtn: { backgroundColor: '#2563eb', paddingVertical: 14, paddingHorizontal: 32, borderRadius: 8 },
  modalBtnText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})