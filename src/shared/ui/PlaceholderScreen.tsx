import React from "react"

import { StyleSheet, Text, View } from "react-native"

export function PlaceholderScreen(props: { title: string; description: string }) {
  return (
    <View style={styles.container}>
      <Text style={styles.title}>{props.title}</Text>
      <Text style={styles.description}>{props.description}</Text>
    </View>
  )
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    paddingHorizontal: 24,
    backgroundColor: "#0B1220",
  },
  title: {
    marginBottom: 12,
    fontSize: 22,
    fontWeight: "700",
    color: "#F8FAFC",
  },
  description: {
    textAlign: "center",
    fontSize: 15,
    lineHeight: 22,
    color: "#CBD5E1",
  },
})

