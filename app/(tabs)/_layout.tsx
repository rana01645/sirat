import React from 'react';
import FontAwesome from '@expo/vector-icons/FontAwesome';
import { Tabs } from 'expo-router';

import Colors from '@/constants/Colors';
import { useColorScheme } from '@/components/useColorScheme';

function TabBarIcon(props: {
  name: React.ComponentProps<typeof FontAwesome>['name'];
  color: string;
}) {
  return <FontAwesome size={24} style={{ marginBottom: -3 }} {...props} />;
}

export default function TabLayout() {
  const colorScheme = useColorScheme();

  return (
    <Tabs
      screenOptions={{
        tabBarActiveTintColor: Colors[colorScheme ?? 'light'].tint,
        headerShown: false,
        tabBarStyle: {
          borderTopWidth: 0.5,
          borderTopColor: colorScheme === 'dark' ? '#2A2A40' : '#E5E5E5',
        },
      }}>
      <Tabs.Screen
        name="index"
        options={{
          title: 'Home',
          tabBarIcon: ({ color }) => <TabBarIcon name="sun-o" color={color} />,
        }}
      />
      <Tabs.Screen
        name="reader"
        options={{
          title: 'Reader',
          tabBarIcon: ({ color }) => <TabBarIcon name="book" color={color} />,
        }}
      />
      <Tabs.Screen
        name="discovery"
        options={{
          title: 'Discovery',
          tabBarIcon: ({ color }) => <TabBarIcon name="compass" color={color} />,
        }}
      />
      <Tabs.Screen
        name="vocabulary"
        options={{
          title: 'শব্দ',
          tabBarIcon: ({ color }) => <TabBarIcon name="language" color={color} />,
        }}
      />
      <Tabs.Screen
        name="profile"
        options={{
          title: 'Profile',
          tabBarIcon: ({ color }) => <TabBarIcon name="user" color={color} />,
        }}
      />
    </Tabs>
  );
}
