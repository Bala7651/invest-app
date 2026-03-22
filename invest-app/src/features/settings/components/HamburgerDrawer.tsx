import { useRouter } from 'expo-router';
import { createContext, useContext, useRef } from 'react';
import { Pressable, Text, View } from 'react-native';
import ReanimatedDrawerLayout, { DrawerLayoutMethods, DrawerType } from 'react-native-gesture-handler/ReanimatedDrawerLayout';

interface DrawerContextValue {
  openDrawer: () => void;
}

const DrawerContext = createContext<DrawerContextValue>({ openDrawer: () => {} });

export function useDrawer() {
  return useContext(DrawerContext);
}

interface HamburgerDrawerProps {
  children: React.ReactNode;
  onDrawerStateChange?: (isOpen: boolean) => void;
}

function DrawerContent({ closeDrawer }: { closeDrawer: () => void }) {
  const router = useRouter();

  function handleSettingsPress() {
    closeDrawer();
    setTimeout(() => router.push('/settings'), 300);
  }

  return (
    <View style={{ flex: 1, paddingTop: 52, paddingHorizontal: 16 }} className="bg-surface">
      <Pressable
        onPress={handleSettingsPress}
        className="py-4 border-b border-border"
      >
        <Text className="text-text text-base">設定</Text>
      </Pressable>
    </View>
  );
}

export function HamburgerDrawer({ children, onDrawerStateChange }: HamburgerDrawerProps) {
  const drawerRef = useRef<DrawerLayoutMethods>(null);

  function openDrawer() {
    drawerRef.current?.openDrawer();
  }

  function closeDrawer() {
    drawerRef.current?.closeDrawer();
  }

  return (
    <DrawerContext.Provider value={{ openDrawer }}>
      <ReanimatedDrawerLayout
        ref={drawerRef}
        drawerType={DrawerType.FRONT}
        drawerWidth={260}
        overlayColor="rgba(0,0,0,0.6)"
        edgeWidth={40}
        onDrawerOpen={() => onDrawerStateChange?.(true)}
        onDrawerClose={() => onDrawerStateChange?.(false)}
        renderNavigationView={() => <DrawerContent closeDrawer={closeDrawer} />}
      >
        {children}
      </ReanimatedDrawerLayout>
    </DrawerContext.Provider>
  );
}
