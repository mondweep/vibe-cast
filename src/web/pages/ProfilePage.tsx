import React, { useState } from 'react';
import { useAuth } from '@/auth/AuthContext';
import { useLearnerProfile } from '@/hooks/useLearnerProfile';
import { User, Mail, Edit2, Save, X } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export function ProfilePage() {
  const { user, signOut } = useAuth();
  const navigate = useNavigate();
  const { data: profile, isLoading } = useLearnerProfile(user?.id);
  const [editMode, setEditMode] = useState(false);
  const [displayName, setDisplayName] = useState(profile?.displayName || '');
  const [bio, setBio] = useState(profile?.bio || '');
  const [saving, setSaving] = useState(false);

  const handleSave = async () => {
    // In a real app, this would call an API to update the profile
    setSaving(true);
    try {
      // TODO: Call updateProfile API
      setEditMode(false);
    } finally {
      setSaving(false);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut();
      navigate('/login');
    } catch (err) {
      console.error('Logout failed:', err);
    }
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="text-gray-600">Loading profile...</div>
      </div>
    );
  }

  return (
    <div className="max-w-2xl">
      <div className="space-y-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Profile</h1>
          <p className="text-gray-600 mt-2">
            Manage your account settings and information
          </p>
        </div>

        {/* Profile Card */}
        <div className="bg-white rounded-lg shadow p-6">
          <div className="flex justify-between items-start mb-6">
            <h2 className="text-xl font-bold text-gray-900">Account Information</h2>
            <button
              onClick={() => setEditMode(!editMode)}
              className="flex items-center gap-2 px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 transition"
            >
              {editMode ? (
                <>
                  <X size={18} />
                  Cancel
                </>
              ) : (
                <>
                  <Edit2 size={18} />
                  Edit
                </>
              )}
            </button>
          </div>

          <div className="space-y-6">
            {/* Avatar */}
            <div className="flex items-center space-x-4">
              <div className="w-20 h-20 bg-gradient-to-br from-primary-400 to-primary-600 rounded-full flex items-center justify-center flex-shrink-0">
                <User size={40} className="text-white" />
              </div>
              {editMode && (
                <button className="px-4 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition text-sm">
                  Change Avatar
                </button>
              )}
            </div>

            {/* Display Name */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Display Name
              </label>
              {editMode ? (
                <input
                  type="text"
                  value={displayName}
                  onChange={(e) => setDisplayName(e.target.value)}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                />
              ) : (
                <p className="text-gray-900 font-medium">{displayName || 'Not set'}</p>
              )}
            </div>

            {/* Email (Read-only) */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Email Address
              </label>
              <div className="flex items-center gap-2">
                <Mail size={18} className="text-gray-400" />
                <p className="text-gray-900 font-medium">{user?.email}</p>
              </div>
              <p className="text-xs text-gray-500 mt-1">Cannot be changed</p>
            </div>

            {/* Bio */}
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                Bio
              </label>
              {editMode ? (
                <textarea
                  value={bio}
                  onChange={(e) => setBio(e.target.value)}
                  rows={4}
                  className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500"
                  placeholder="Tell us about yourself..."
                />
              ) : (
                <p className="text-gray-700">{bio || 'No bio added yet'}</p>
              )}
            </div>

            {/* Stats */}
            {profile && (
              <div className="pt-4 border-t border-gray-200 grid grid-cols-3 gap-4">
                <div>
                  <p className="text-sm text-gray-600">Total Enrollments</p>
                  <p className="text-2xl font-bold text-gray-900">
                    {profile.totalEnrollments}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Badges Earned</p>
                  <p className="text-2xl font-bold text-yellow-600">
                    {profile.badgesEarned}
                  </p>
                </div>
                <div>
                  <p className="text-sm text-gray-600">Reputation</p>
                  <p className="text-2xl font-bold text-primary-600">
                    {profile.reputationScore}
                  </p>
                </div>
              </div>
            )}

            {/* Save Button */}
            {editMode && (
              <div className="flex gap-3 pt-4 border-t border-gray-200">
                <button
                  onClick={handleSave}
                  disabled={saving}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition disabled:opacity-50 font-medium"
                >
                  <Save size={18} />
                  {saving ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Account Settings */}
        <div className="bg-white rounded-lg shadow p-6">
          <h2 className="text-xl font-bold text-gray-900 mb-6">
            Account Settings
          </h2>

          <div className="space-y-4">
            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Email Notifications</p>
                <p className="text-sm text-gray-600">
                  Receive updates about your enrollments
                </p>
              </div>
              <input type="checkbox" defaultChecked className="w-5 h-5" />
            </div>

            <div className="flex items-center justify-between p-4 border border-gray-200 rounded-lg">
              <div>
                <p className="font-medium text-gray-900">Two-Factor Authentication</p>
                <p className="text-sm text-gray-600">
                  Add extra security to your account
                </p>
              </div>
              <button className="px-4 py-2 text-primary-600 hover:text-primary-700 font-medium text-sm">
                Enable
              </button>
            </div>
          </div>
        </div>

        {/* Danger Zone */}
        <div className="bg-red-50 border border-red-200 rounded-lg p-6">
          <h2 className="text-lg font-bold text-red-900 mb-4">Danger Zone</h2>

          <div className="space-y-4">
            <button
              onClick={handleLogout}
              className="w-full px-6 py-3 border border-red-300 text-red-700 rounded-lg hover:bg-red-50 transition font-medium"
            >
              Log Out
            </button>

            <button className="w-full px-6 py-3 border border-red-500 bg-red-500 text-white rounded-lg hover:bg-red-600 transition font-medium">
              Delete Account
            </button>
          </div>

          <p className="text-sm text-red-700 mt-4">
            Be careful! Deleting your account cannot be undone. All your data
            will be permanently removed.
          </p>
        </div>
      </div>
    </div>
  );
}

export default ProfilePage;
