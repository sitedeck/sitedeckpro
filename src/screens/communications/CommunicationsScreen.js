import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, FlatList, TouchableOpacity, TextInput, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { collection, query, where, orderBy, onSnapshot } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_COMMUNICATIONS } from '../../constants/collections'
import { ADMIN, SUPERVISOR } from '../../constants/roles'

export default function CommunicationsScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userRole, setUserRole] = useState(null)
  const [messages, setMessages] = useState([])
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
    const q = query(collection(db, COL_COMMUNICATIONS), where('orgId', '==', orgId), orderBy('createdAt', 'desc'))
    const unsub = onSnapshot(q, snap => {
      setMessages(snap.docs.map(d => ({ id: d.id, ...d.data() })))
      setLoading(false)
    })
    return () => unsub()
  }, [orgId])

  const formatDate = (iso) => {
    if (!iso) return ''
    return new Date(iso).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
  }

  const TYPE_COLORS = { 'Safety Alert': '#dc2626', 'Event': '#f59e0b', 'General': '#2563eb' }
  const TYPE_BG = { 'Safety Alert': '#fef2f2', 'Event': '#fffbeb', 'General': '#eff6ff' }

  const renderItem = ({ item }) => {
    const isUnread = !item.readBy?.includes(userId)
    return (
      <TouchableOpacity style={[styles.card, isUnread && styles.cardUnread]}
        onPress={() => navigation.navigate('MessageDetail', { messageId: item.id })}>
        <View style={[styles.typeBadge, { backgroundColor: TYPE_BG[item.type] || '#f5f5f5' }]}>
          <Text style={[styles.typeText, { color: TYPE_COLORS[item.type] || '#888' }]}>{item.type || 'General'}</Text>
        </View>
        <Text style={[styles.msgTitle, isUnread && styles.msgTitleUnread]} numberOfLines={1}>{item.title}</Text>
        <View style={styles.cardFooter}>
          <Text style={styles.senderText}>{item.senderName || 'Unknown'}</Text>
          <Text style={styles.dateText}>{formatDate(item.createdAt)}</Text>
        </View>
        {isUnread && <View style={styles.unreadDot} />}
      </TouchableOpacity>
    )
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.headerTitle}>Communications</Text>
        {(userRole === ADMIN || userRole === SUPERVISOR) && (
          <TouchableOpacity style={styles.addBtn} onPress={() => navigation.navigate('ComposeMessage')}>
            <Ionicons name="create-outline" size={22} color="#fff" />
          </TouchableOpacity>
        )}
      </View>
      {loading ? (
        <ActivityIndicator size="large" color="#2563eb" style={{ marginTop: 40 }} />
      ) : messages.length === 0 ? (
        <View style={styles.emptyState}>
          <Ionicons name="mail-outline" size={48} color="#ccc" />
          <Text style={styles.emptyTitle}>No messages</Text>
          <Text style={styles.emptySub}>Communications will appear here.</Text>
        </View>
      ) : (
        <FlatList data={messages} keyExtractor={item => item.id} renderItem={renderItem}
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
  card: { backgroundColor: '#fff', borderRadius: 12, padding: 16, marginBottom: 10, borderWidth: 1, borderColor: '#e5e7eb' },
  cardUnread: { borderLeftWidth: 3, borderLeftColor: '#2563eb' },
  typeBadge: { alignSelf: 'flex-start', paddingHorizontal: 8, paddingVertical: 2, borderRadius: 4, marginBottom: 6 },
  typeText: { fontSize: 11, fontWeight: '600' },
  msgTitle: { fontSize: 16, fontWeight: '600', color: '#1a1a1a', marginBottom: 8 },
  msgTitleUnread: { fontWeight: '700' },
  cardFooter: { flexDirection: 'row', justifyContent: 'space-between' },
  senderText: { fontSize: 13, color: '#888' },
  dateText: { fontSize: 13, color: '#888' },
  unreadDot: { position: 'absolute', top: 16, right: 16, width: 10, height: 10, borderRadius: 5, backgroundColor: '#2563eb' },
  emptyState: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  emptyTitle: { fontSize: 18, fontWeight: '600', color: '#333', marginTop: 12 },
  emptySub: { fontSize: 14, color: '#888', marginTop: 4 }
})