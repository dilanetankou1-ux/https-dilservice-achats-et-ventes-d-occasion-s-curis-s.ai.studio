import React, { createContext, useContext, useEffect, useState } from 'react';
import { onAuthStateChanged, type User } from 'firebase/auth';
import {
  doc,
  getDoc,
  onSnapshot,
  serverTimestamp,
  setDoc,
  updateDoc,
} from 'firebase/firestore';
import {
  auth,
  db,
  handleFirestoreError,
  OperationType,
  signInWithGoogle,
  signOutUser,
} from '../lib/firebase';
import {
  BLUEPRINT_LIMITS,
  type ContinentRegion,
  type CurrencyCode,
  type UserProfile,
} from '../types/marketplace';

interface AuthContextValue {
  user: User | null;
  authReady: boolean;
  userProfile: UserProfile | null;
  authError: string | null;
  signingIn: boolean;
  signIn: () => Promise<void>;
  signOut: () => Promise<void>;
  updateProfileDetails: (details: {
    displayName: string;
    country: string;
    city: string;
    neighborhood: string;
    continent: ContinentRegion;
    preferredCurrency: CurrencyCode;
    phone: string;
    whatsappNumber: string;
  }) => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [authReady, setAuthReady] = useState(false);
  const [userProfile, setUserProfile] = useState<UserProfile | null>(null);
  const [authError, setAuthError] = useState<string | null>(null);
  const [signingIn, setSigningIn] = useState(false);

  useEffect(() => {
    let profileUnsub: (() => void) | null = null;

    const unsubscribe = onAuthStateChanged(auth, async (firebaseUser) => {
      if (profileUnsub) {
        profileUnsub();
        profileUnsub = null;
      }

      setUser(firebaseUser);
      setAuthReady(true);

      if (!firebaseUser) {
        setUserProfile(null);
        return;
      }

      const safeDisplayName = (
        firebaseUser.displayName?.trim() ||
        firebaseUser.email?.split('@')[0] ||
        'Membre Dilservice'
      ).slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
      const safePhotoUrl = (firebaseUser.photoURL || '').slice(
        0,
        BLUEPRINT_LIMITS.PHOTO_URL_MAX
      );
      const safeEmail = (firebaseUser.email || 'membre@dilservice.app').slice(
        0,
        254
      );

      const userRef = doc(db, 'users', firebaseUser.uid);
      const publicRef = doc(db, 'publicProfiles', firebaseUser.uid);

      try {
        const snap = await getDoc(userRef);
        if (!snap.exists()) {
          await setDoc(userRef, {
            uid: firebaseUser.uid,
            email: safeEmail,
            displayName: safeDisplayName,
            country: 'France',
            city: 'Paris',
            neighborhood: '',
            continent: 'europe',
            preferredCurrency: 'EUR',
            phone: '',
            whatsappNumber: '',
            photoURL: safePhotoUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        } else {
          const data = snap.data() as Partial<UserProfile>;
          if (
            data.continent === undefined ||
            data.preferredCurrency === undefined ||
            data.country === undefined ||
            data.neighborhood === undefined ||
            data.whatsappNumber === undefined
          ) {
            await updateDoc(userRef, {
              country: (data.country ?? 'France').slice(
                0,
                BLUEPRINT_LIMITS.COUNTRY_MAX
              ),
              neighborhood: (data.neighborhood ?? '').slice(
                0,
                BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX
              ),
              continent: data.continent || 'europe',
              preferredCurrency: data.preferredCurrency || 'EUR',
              whatsappNumber: (data.whatsappNumber ?? data.phone ?? '').slice(
                0,
                BLUEPRINT_LIMITS.WHATSAPP_MAX
              ),
              updatedAt: serverTimestamp(),
            });
          }
        }

        const publicSnap = await getDoc(publicRef);
        if (!publicSnap.exists()) {
          await setDoc(publicRef, {
            uid: firebaseUser.uid,
            displayName: safeDisplayName,
            city: 'Paris',
            photoURL: safePhotoUrl,
            createdAt: serverTimestamp(),
            updatedAt: serverTimestamp(),
          });
        }
      } catch (error) {
        handleFirestoreError(
          error,
          OperationType.WRITE,
          `users/${firebaseUser.uid}`
        );
      }

      profileUnsub = onSnapshot(
        userRef,
        (snapshot) => {
          if (snapshot.exists()) {
            setUserProfile(snapshot.data() as UserProfile);
          }
        },
        (error) => {
          handleFirestoreError(
            error,
            OperationType.GET,
            `users/${firebaseUser.uid}`
          );
        }
      );
    });

    return () => {
      unsubscribe();
      if (profileUnsub) profileUnsub();
    };
  }, []);

  const signIn = async () => {
    setAuthError(null);
    setSigningIn(true);
    try {
      await signInWithGoogle();
    } catch (error) {
      const msg = error instanceof Error ? error.message : String(error);
      if (!msg.includes('popup-closed-by-user')) {
        setAuthError('La connexion Google a échoué. Veuillez réessayer.');
      }
    } finally {
      setSigningIn(false);
    }
  };

  const signOut = async () => {
    await signOutUser();
  };

  const updateProfileDetails = async (details: {
    displayName: string;
    country: string;
    city: string;
    neighborhood: string;
    continent: ContinentRegion;
    preferredCurrency: CurrencyCode;
    phone: string;
    whatsappNumber: string;
  }) => {
    if (!user) return;
    const cleanName = details.displayName
      .trim()
      .slice(0, BLUEPRINT_LIMITS.DISPLAY_NAME_MAX);
    const cleanCountry = details.country
      .trim()
      .slice(0, BLUEPRINT_LIMITS.COUNTRY_MAX);
    const cleanCity = details.city.trim().slice(0, BLUEPRINT_LIMITS.CITY_MAX);
    const cleanNeighborhood = details.neighborhood
      .trim()
      .slice(0, BLUEPRINT_LIMITS.NEIGHBORHOOD_MAX);
    const cleanPhone = details.phone.trim().slice(0, BLUEPRINT_LIMITS.PHONE_MAX);
    const cleanWhatsapp = details.whatsappNumber
      .trim()
      .slice(0, BLUEPRINT_LIMITS.WHATSAPP_MAX);
    const safePhoto = (user.photoURL || '').slice(
      0,
      BLUEPRINT_LIMITS.PHOTO_URL_MAX
    );

    if (cleanName.length < BLUEPRINT_LIMITS.DISPLAY_NAME_MIN) {
      throw new Error('Le nom affiché est requis.');
    }

    const userRef = doc(db, 'users', user.uid);
    const publicRef = doc(db, 'publicProfiles', user.uid);

    try {
      await updateDoc(userRef, {
        displayName: cleanName,
        country: cleanCountry,
        city: cleanCity,
        neighborhood: cleanNeighborhood,
        continent: details.continent,
        preferredCurrency: details.preferredCurrency,
        phone: cleanPhone,
        whatsappNumber: cleanWhatsapp,
        photoURL: safePhoto,
        updatedAt: serverTimestamp(),
      });
      await updateDoc(publicRef, {
        displayName: cleanName,
        city: cleanCity,
        photoURL: safePhoto,
        updatedAt: serverTimestamp(),
      });
    } catch (error) {
      handleFirestoreError(error, OperationType.UPDATE, `users/${user.uid}`);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        authReady,
        userProfile,
        authError,
        signingIn,
        signIn,
        signOut,
        updateProfileDetails,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth doit être utilisé dans un AuthProvider.');
  }
  return ctx;
}
