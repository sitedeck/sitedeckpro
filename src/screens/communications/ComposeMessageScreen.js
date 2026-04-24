import React, { useState, useEffect } from 'react'
import { View, Text, StyleSheet, ScrollView, TouchableOpacity, TextInput, Alert, ActivityIndicator } from 'react-native'
import { useNavigation } from '@react-navigation/native'
import { Ionicons } from '@expo/vector-icons'
import { onAuthStateChanged } from 'firebase/auth'
import { addDoc, collection, doc, getDoc, onSnapshot, query, where } from 'firebase/firestore'
import { auth, db } from '../../firebase.config'
import { COL_COMMUNICATIONS, COL_USERS } from '../../constants/collections'

const TYPE_OPTIONS = ['Safety Alert', 'Event', 'General']

export default function ComposeMessageScreen() {
  const navigation = useNavigation()
  const [orgId, setOrgId] = useState(null)
  const [userId, setUserId] = useState(null)
  const [userName, setUserName] = useState('')
  const [type, setType] = useState('General')
  const [title, setTitle] = useState('')
  const [body, setBody] = useState('')
  const [audience, setAudience] = useState('All Crew')
  const [users, setUsers] = useState([])
  const [selectedUsers, setSelectedUsers] = useState([])
  const [saving, setSaving] = useState(false)

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (user) => {
      if (user) {
        setUserId(user.uid)
        const { getDoc, doc } = require('firebase/firestore')
        const userDoc = await getDoc(doc(db, COL_USERS, user.uid))
        if (userDoc.exists()) {
          setOrgId(userDoc.data().orgId)
          setUserName(user.displayName || userDoc.data().name || 'Unknown')
          const q = query(collection(db, COL_USERS), where('orgId', '==', userDoc.data().orgId))
          onSnapshot(q, snap => setUsers(snap.docs.map(d => ({ id: d.id, ...d.data() }))))
        }
      }
    })
    return () => unsubscribe()
  }, [])

  const toggleUser = (uid) => setSelectedUsers(prev => prev.includes(uid) ? prev.filter(id => id !== uid) : [...prev, uid])

  const handleSend = async () => {
    if (!title.trim()) { Alert.alert('Required', 'Title is required'); return }
    if (!body.trim()) { Alert.alert('Required', 'Message body is required'); return }

    setSaving(true)
    try {
      await addDoc(collection(db, COL_COMMUNICATIONS), {
        orgId,
        type,
        title: title.trim(),
        body: body.trim(),
        senderId: userId,
        senderName: userName,
        audience,
        recipientIds: audience === 'Specific Users' ? selectedUsers : [],
        readBy: [userId],
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      })
      Alert.alert('Sent', 'Message sent successfully', [{ text: 'OK', onPress: () => navigation.goBack() }])
    } catch (err) { Alert.alert('Error', err.message) }
    finally { setSaving(false) }
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backBtn}>
          <Ionicons name="chevron-back" size={24} color="#1a1a1a" />
        </TouchableOpacity>
        <Text style={styles.headerTitle}>New Message</Text>
        <View style={{ width: 40 }} />
      </View>
      <ScrollView style={styles.scrollView} contentContainerStyle={styles.content}>
        <Text style={styles.label}>Type</Text>
        <View style={styles.typeRow}>
          {TYPE_OPTIONS.map(t => (
            <TouchableOpacity key={t} style={[styles.typePill, type === t && styles.typePillActive]}
              onPress={() => setType(t)}>
              <Text style={[styles.typePillText, type === t && styles.typePillTextActive]}>{t}</Text>
            </TouchableOpacity>
          ))}
        </View>

        <Text style={styles.label}>Title *</Text>
        <TextInput style={styles.input} placeholder="Message title" value={title} onChangeText={setTitle} />

        <Text style={styles.label}>Message *</Text>
        <TextInput style={styles.textArea} placeholder="Message content..." value={body}
          onChangeText={setBody} multiline numberOfLines={5} textAlignVertical="top" />

        <Text style={styles.label}>Audience</Text>
        {['All Crew', 'Specific Users'].map(a => (
          <TouchableOpacity key={a} style={[styles.audienceOption, audience === a && styles.audienceActive]}
            onPress={() => setAudience(a)}>
            <Ionicons name={audience === a ? 'radio-button-on' : 'radio-button-off'} size={20}
              color={audience === a ? '#2563eb' : '#888'} />
            <Text style={[styles.audienceText, audience === a && styles.audienceTextActive]}>{a}</Text>
          </TouchableOpacity>
        ))}

        {audience === 'Specific Users' && (
          <View style={styles.userList}>
            {users.map(u => (
              <TouchableOpacity key={u.id} style={[styles.userItem, selectedUsers.includes(u.id) && styles.userSelected]}
                onPress={() => toggleUser(u.id)}>
                <Ionicons name={selectedUsers.includes(u.id) ? 'checkbox' : 'square-outline'}
                  size={18} color={selectedUsers.includes(u.id) ? '#16a34a' : '#888'} />
                <Text style={styles.userName}>{u.name || u.email}</Text>
              </TouchableOpacity>
            ))}
          </View>
        )}

        <TouchableOpacity style={[styles.sendBtn, saving && styles.sendBtnDisabled]}
          onPress={handleSend} disabled={saving}>
          {saving ? <ActivityIndicator color="#fff" /> : <Text style={styles.sendText}>Send Message</Text>}
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
  textArea: { borderWidth: 1, borderColor: '#e5e7eb', borderRadius: 8, padding: 12, fontSize: 15, backgroundColor: '#fafafa', color: '#1a1a1a', minHeight: 120 },
  typeRow: { flexDirection: 'row', gap: 8 },
  typePill: { paddingHorizontal: 16, paddingVertical: 8, borderRadius: 20, backgroundColor: '#f5f5f5', borderWidth: 1, borderColor: '#e5e7eb' },
  typePillActive: { backgroundColor: '#2563eb', borderColor: '#2563eb' },
  typePillText: { fontSize: 14, color: '#333' },
  typePillTextActive: { color: '#fff', fontWeight: '500' },
  audienceOption: { flexDirection: 'row', alignItems: 'center', gap: 10, padding: 12, borderRadius: 8, backgroundColor: '#f5f5f5', marginBottom: 8 },
  audienceActive: { backgroundColor: '#eff6ff', borderWidth: 1, borderColor: '#2563eb' },
  audienceText: { fontSize: 15, color: '#333' },
  audienceTextActive: { color: '#2563eb', fontWeight: '500' },
  userList: { gap: 6 },
  userItem: { flexDirection: 'row', alignItems: 'center', gap: 8, padding: 10, borderRadius: 8, backgroundColor: '#f5f5f5' },
  userSelected: { backgroundColor: '#f0fdf4', borderWidth: 1, borderColor: '#16a34a' },
  userName: { fontSize: 14, color: '#333' },
  sendBtn: { backgroundColor: '#2563eb', padding: 16, borderRadius: 8, alignItems: 'center', marginTop: 32, marginBottom: 40 },
  sendBtnDisabled: { backgroundColor: '#93c5fd' },
  sendText: { color: '#fff', fontSize: 16, fontWeight: '600' }
})