import * as React from 'react';
import { useState } from 'react';
import {
  Text,
  View,
  ScrollView,
  SafeAreaView,
  TouchableOpacity,
  StatusBar,
  TextInput,
  Alert,
  Linking,
  Switch,
} from 'react-native';
import { useRouter } from 'expo-router';
import { Ionicons } from '@expo/vector-icons';
import { useTheme } from '@/hooks/useTheme';
import { useUserStore } from './store/userStore';
import { getResponsiveSize, getResponsiveHeight } from '../utils/responsive';
import { downloadLumiModel, getLocalModelStatus, deleteLocalModel } from '../utils/localModel';

export default function SettingsPage() {
  const router = useRouter();
  const { colors, createThemedStyles, isDark, setTheme } = useTheme();
  const { username, updateUsername } = useUserStore();
  const [newUsername, setNewUsername] = useState(username);
  const [isEditingUsername, setIsEditingUsername] = useState(false);
  const [supportExpanded, setSupportExpanded] = useState(false);
  const [modelHasFile, setModelHasFile] = useState<boolean>(false);
  const [downloading, setDownloading] = useState<boolean>(false);
  const [downloadPct, setDownloadPct] = useState<number | null>(null);

  const handleUsernameUpdate = async () => {
    if (newUsername.trim() === '') {
      Alert.alert('Error', 'Username cannot be empty');
      return;
    }
    
    try {
      await updateUsername(newUsername.trim());
      setIsEditingUsername(false);
    } catch (error) {
      Alert.alert('Error', 'Failed to update username');
    }
  };

  const handleSupportMe = () => {
    Linking.openURL('https://coff.ee/taratdev').catch(err => {
      Alert.alert('Error', 'Could not open link');
    });
  };

  const styles = createThemedStyles((colors) => ({
    safeArea: {
      flex: 1,
      backgroundColor: colors.background,
      paddingTop: getResponsiveHeight(28),
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      paddingHorizontal: getResponsiveSize(24),
      paddingTop: getResponsiveHeight(20),
      paddingBottom: getResponsiveSize(10),
      borderBottomWidth: 1,
      borderBottomColor: colors.border,
    },
    backButton: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'flex-start',
      gap: getResponsiveSize(12),
    },
    backText: {
      fontSize: getResponsiveSize(24),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveSize(3),
    },
    container: {
      flex: 1,
      padding: getResponsiveSize(20),
    },
    section: {
      marginBottom: getResponsiveHeight(32),
    },
    sectionTitle: {
      fontSize: getResponsiveSize(20),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      marginBottom: getResponsiveHeight(16),
    },
    settingItem: {
      backgroundColor: colors.surface,
      padding: getResponsiveSize(16),
      borderRadius: getResponsiveSize(12),
      marginBottom: getResponsiveSize(12),
    },
    settingRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    settingText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      marginLeft: getResponsiveSize(12),
    },
    settingLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      flex: 1,
    },
    usernameContainer: {
      backgroundColor: colors.surface,
      padding: getResponsiveSize(16),
      borderRadius: getResponsiveSize(12),
    },
    usernameRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    usernameText: {
      fontSize: getResponsiveSize(18),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
      flex: 1,
    },
    usernameInput: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Regular',
      color: colors.text,
      backgroundColor: colors.card,
      padding: getResponsiveSize(12),
      borderRadius: getResponsiveSize(8),
      marginTop: getResponsiveHeight(12),
      borderWidth: 1,
      borderColor: colors.border,
    },
    usernameActions: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
      gap: getResponsiveSize(12),
      marginTop: getResponsiveHeight(12),
    },
    actionButton: {
      paddingHorizontal: getResponsiveSize(16),
      paddingVertical: getResponsiveSize(8),
      borderRadius: getResponsiveSize(8),
      borderWidth: 1,
      borderColor: colors.border,
    },
    saveButton: {
      backgroundColor: colors.primary,
    },
    actionButtonText: {
      fontSize: getResponsiveSize(14),
      fontFamily: 'MonaSans-Medium',
      color: colors.text,
    },
    saveButtonText: {
      color: colors.primaryText,
    },
    accordionContent: {
      marginTop: getResponsiveHeight(16),
      paddingTop: getResponsiveHeight(16),
      borderTopWidth: 1,
      borderTopColor: colors.border,
    },
    supportDescription: {
      fontSize: getResponsiveSize(15),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      lineHeight: getResponsiveSize(22),
      marginBottom: getResponsiveHeight(16),
    },
    supportButton: {
      backgroundColor: colors.primary,
      padding: getResponsiveSize(12),
      borderRadius: getResponsiveSize(8),
      alignItems: 'center',
    },
    supportButtonText: {
      fontSize: getResponsiveSize(16),
      fontFamily: 'MonaSans-Medium',
      color: colors.primaryText,
    },
    rowBetween: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    smallNote: {
      fontSize: getResponsiveSize(13),
      fontFamily: 'MonaSans-Regular',
      color: colors.textSecondary,
      marginTop: getResponsiveHeight(8),
    },
  }));

  React.useEffect(() => {
    (async () => {
      try {
        const status = await getLocalModelStatus();
        setModelHasFile(!!status.hasModel);
      } catch {}
    })();
  }, []);

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar barStyle={colors.statusBarStyle} />
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()} style={styles.backButton}>
          <Ionicons name="arrow-back" size={getResponsiveSize(28)} color={colors.text} />
          <Text style={styles.backText}>Settings</Text>
        </TouchableOpacity>
      </View>
      <ScrollView style={styles.container}>

        {/* Username Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Profile</Text>
          <View style={styles.usernameContainer}>
            {isEditingUsername ? (
              <>
                <TextInput
                  style={styles.usernameInput}
                  value={newUsername}
                  onChangeText={setNewUsername}
                  placeholder="Enter your username"
                  placeholderTextColor={colors.textTertiary}
                  autoFocus
                />
                <View style={styles.usernameActions}>
                  <TouchableOpacity
                    style={styles.actionButton}
                    onPress={() => {
                      setNewUsername(username);
                      setIsEditingUsername(false);
                    }}
                  >
                    <Text style={styles.actionButtonText}>Cancel</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={[styles.actionButton, styles.saveButton]}
                    onPress={handleUsernameUpdate}
                  >
                    <Text style={[styles.actionButtonText, styles.saveButtonText]}>Save</Text>
                  </TouchableOpacity>
                </View>
              </>
            ) : (
              <View style={styles.usernameRow}>
                <Text style={styles.usernameText}>{username}</Text>
                <TouchableOpacity
                  onPress={() => setIsEditingUsername(!isEditingUsername)}
                >
                  <Ionicons 
                    name="create-outline" 
                    size={getResponsiveSize(20)} 
                    color={colors.text} 
                  />
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Appearance Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Appearance</Text>
          <View style={styles.settingItem}>
            <View style={styles.settingRow}>
              <View style={styles.settingLeft}>
                <Ionicons 
                  name={isDark ? 'moon' : 'sunny'} 
                  size={getResponsiveSize(20)} 
                  color={colors.text} 
                />
                <Text style={styles.settingText}>
                  {isDark ? 'Dark Mode' : 'Light Mode'}
                </Text>
              </View>
              <Switch
                value={isDark}
                onValueChange={(value) => setTheme(value ? 'dark' : 'light')}
                trackColor={{ 
                  false: isDark ? '#3a3a3a' : colors.border, 
                  true: colors.primary 
                }}
                thumbColor='#ffffff'
                ios_backgroundColor={isDark ? '#3a3a3a' : colors.border}
              />
            </View>
          </View>
        </View>

        {/* Support Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Support</Text>
          <View style={styles.settingItem}>
            <TouchableOpacity 
              onPress={() => setSupportExpanded(!supportExpanded)}
            >
              <View style={styles.settingRow}>
                <View style={styles.settingLeft}>
                  <Ionicons 
                    name="heart-outline" 
                    size={getResponsiveSize(20)} 
                    color={colors.text} 
                  />
                  <Text style={styles.settingText}>Support Me</Text>
                </View>
                <Ionicons 
                  name={supportExpanded ? 'chevron-down' : 'chevron-forward'} 
                  size={getResponsiveSize(20)} 
                  color={colors.textSecondary} 
                />
              </View>
            </TouchableOpacity>
            
            {supportExpanded && (
              <View style={styles.accordionContent}>
                <Text style={styles.supportDescription}>
                  Hi! I'm Tarat, a solo developer building Lumi with passion and dedication. 
                  If you're enjoying the app and would like to support its development, 
                  you can buy me a coffee! Thank you for your support! ☕️
                </Text>
                <TouchableOpacity 
                  style={styles.supportButton}
                  onPress={handleSupportMe}
                >
                  <Text style={styles.supportButtonText}>Buy me a coffee ☕️</Text>
                </TouchableOpacity>
              </View>
            )}
          </View>
        </View>

        {/* Local Model Section */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>Local Model</Text>
          <View style={styles.settingItem}>
            <View style={styles.rowBetween}>
              <View style={styles.settingLeft}>
                <Ionicons 
                  name="download-outline" 
                  size={getResponsiveSize(20)} 
                  color={colors.text} 
                />
                <Text style={styles.settingText}>
                  {modelHasFile ? 'Model downloaded' : 'Download Lumi model'}{downloading && typeof downloadPct === 'number' ? ` (${downloadPct}%)` : ''}
                </Text>
              </View>
              <TouchableOpacity
                disabled={downloading}
                onPress={async () => {
                  try {
                    setDownloading(true);
                    setDownloadPct(0);
                    const status = await downloadLumiModel((p) => setDownloadPct(p.pct));
                    setModelHasFile(!!status.hasModel);
                    Alert.alert('Success', 'Model downloaded.');
                  } catch (e) {
                    Alert.alert('Error', 'Failed to download model.');
                  } finally {
                    setDownloading(false);
                    setDownloadPct(null);
                  }
                }}
              >
                <Text style={[styles.actionButtonText, downloading && { opacity: 0.6 }]}>
                  {downloading ? 'Downloading...' : (modelHasFile ? 'Redownload' : 'Download')}
                </Text>
              </TouchableOpacity>
            </View>
            <Text style={styles.smallNote}>
              Runs fully on-device using llama.rn. Internet is only used to download the GGUF file.
            </Text>
          </View>

          <View style={styles.settingItem}>
            <View style={styles.rowBetween}>
              <View style={styles.settingLeft}>
                <Ionicons 
                  name="chatbubbles-outline" 
                  size={getResponsiveSize(20)} 
                  color={colors.text} 
                />
                <Text style={styles.settingText}>Open Local Chat</Text>
              </View>
              <TouchableOpacity
                onPress={async () => {
                  const status = await getLocalModelStatus();
                  if (!status.hasModel) {
                    Alert.alert('Model missing', 'Please download the model first.');
                    return;
                  }
                  router.push('/local-chat');
                }}
              >
                <Ionicons name="chevron-forward" size={getResponsiveSize(20)} color={colors.textSecondary} />
              </TouchableOpacity>
            </View>
          </View>

          {modelHasFile && (
            <View style={styles.settingItem}>
              <View style={styles.rowBetween}>
                <View style={styles.settingLeft}>
                  <Ionicons 
                    name="trash-outline" 
                    size={getResponsiveSize(20)} 
                    color={colors.text} 
                  />
                  <Text style={styles.settingText}>Delete Local Model</Text>
                </View>
                <TouchableOpacity
                  onPress={async () => {
                    try {
                      await deleteLocalModel();
                      const s = await getLocalModelStatus();
                      setModelHasFile(!!s.hasModel);
                    } catch {}
                  }}
                >
                  <Ionicons name="trash" size={getResponsiveSize(18)} color={colors.textSecondary} />
                </TouchableOpacity>
              </View>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
} 