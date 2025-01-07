import {
  Image,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  View,
  Alert,
} from "react-native";
import { useEffect, useState } from "react";
import * as Notifications from "expo-notifications";
import * as Permissions from "expo-permissions";
import { HelloWave } from "@/components/HelloWave";
import { ThemedText } from "@/components/ThemedText";
import { ThemedView } from "@/components/ThemedView";
import MapView, { Marker } from "react-native-maps";
import Icon from "react-native-vector-icons/Ionicons";
import moment from "moment"; // Import moment

export default function HomeScreen() {
  const [earthquakes, setEarthquakes] = useState([]);
  const [selectedQuake, setSelectedQuake] = useState(null);
  const [expoPushToken, setExpoPushToken] = useState("");

  // Request permissions and get the Expo push token
  const registerForPushNotificationsAsync = async () => {
    const { status: existingStatus } = await Permissions.getAsync(
      Permissions.NOTIFICATIONS
    );
    let finalStatus = existingStatus;

    if (existingStatus !== "granted") {
      const { status } = await Permissions.askAsync(Permissions.NOTIFICATIONS);
      finalStatus = status;
    }

    if (finalStatus !== "granted") {
      Alert.alert("Failed to get push token for push notification!");
      return;
    }

    const token = (await Notifications.getExpoPushTokenAsync()).data;
    console.log("Expo Push Token:", token); // Store this token for sending notifications
    setExpoPushToken(token);
  };

  const fetchEarthquakes = async () => {
    try {
      const response = await fetch(
        "https://earthquake.usgs.gov/fdsnws/event/1/query?format=geojson&starttime=2025-01-01&endtime=2025-01-08&minlatitude=3.4&maxlatitude=15.0&minlongitude=33.0&maxlongitude=48.0"
      );
      const text = await response.text();
      console.log("Response Text:", text);

      const data = JSON.parse(text);
      setEarthquakes(data.features);

      // Check if there's a significant earthquake and notify
      data.features.forEach((quake) => {
        if (quake.properties.mag >= 5.0) {
          // Adjust the magnitude threshold as needed
          sendNotification(quake);
        }
      });
    } catch (error) {
      console.error("Error fetching earthquake data:", error);
    }
  };

  // Function to send a test notification
  const sendTestNotification = async () => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Test Notification",
        body: "This is a test notification",
      },
      trigger: null, // Send immediately
    });
  };

  const sendNotification = async (quake) => {
    await Notifications.scheduleNotificationAsync({
      content: {
        title: "Earthquake Alert!",
        body: `Magnitude: ${quake.properties.mag} at ${quake.properties.place}`,
        data: { quake },
      },
      trigger: null, // Send immediately
    });
  };

  useEffect(() => {
    const fetchTokenAndTest = async () => {
      const token = await registerForPushNotificationsAsync();
      if (token) {
        setExpoPushToken(token);
        sendTestNotification(); // Test notification
      }
    };

    fetchTokenAndTest();
    fetchEarthquakes();

    const interval = setInterval(fetchEarthquakes, 60000); // Fetch new data every minute
    return () => clearInterval(interval); // Cleanup interval on unmount
  }, []);

  return (
    <View style={styles.container}>
      {selectedQuake ? (
        <>
          <View style={styles.mapContainer}>
            <MapView
              style={styles.map}
              initialRegion={{
                latitude: selectedQuake.geometry.coordinates[1],
                longitude: selectedQuake.geometry.coordinates[0],
                latitudeDelta: 1,
                longitudeDelta: 1,
              }}
            >
              <Marker
                coordinate={{
                  latitude: selectedQuake.geometry.coordinates[1],
                  longitude: selectedQuake.geometry.coordinates[0],
                }}
                title={`Magnitude: ${selectedQuake.properties.mag}`}
                description={selectedQuake.properties.place}
              />
            </MapView>
            <TouchableOpacity
              style={styles.backButton}
              onPress={() => setSelectedQuake(null)}
            >
              <Icon name="arrow-back" size={30} color="#fff" />
            </TouchableOpacity>
          </View>
          {/* Info section updated to show specific earthquake details */}
          <View style={styles.infoSection}>
            <ThemedText type="subtitle" style={styles.infoText}>
              Earthquake Details
            </ThemedText>
            <ThemedText style={styles.infoText}>
              Magnitude: {selectedQuake.properties.mag}
            </ThemedText>
            <ThemedText style={styles.infoText}>
              Location: {selectedQuake.properties.place}
            </ThemedText>
            <ThemedText style={styles.infoText}>
              Time: {moment(selectedQuake.properties.time).format("llll")}
            </ThemedText>
            <ThemedText style={styles.infoText}>
              Depth: {selectedQuake.geometry.coordinates[2]} km
            </ThemedText>
          </View>
        </>
      ) : (
        <>
          <View style={styles.header}>
            <Image
              // source={require("@/assets/images/earthquake-logo.png")}
              style={styles.reactLogo}
            />
            <ThemedText type="title">Earthquake Alerts</ThemedText>
            <HelloWave />
          </View>

          <ScrollView
            contentContainerStyle={styles.scrollViewContent}
            style={{ paddingBottom: selectedQuake ? 200 : 0 }}
          >
            {" "}
            {/* Adjust padding based on selection */}
            {earthquakes.length > 0 ? (
              earthquakes.map((quake) => (
                <TouchableOpacity
                  key={quake.id}
                  style={styles.stepContainer}
                  onPress={() => setSelectedQuake(quake)}
                >
                  <ThemedText type="subtitle" style={styles.quakeText}>
                    Magnitude: {quake.properties.mag} - Location:{" "}
                    {quake.properties.place}
                  </ThemedText>
                  {/* Use moment to format time */}
                  <ThemedText style={styles.quakeText}>
                    {moment(quake.properties.time).format("llll")}
                  </ThemedText>
                </TouchableOpacity>
              ))
            ) : (
              <ThemedView style={styles.stepContainer}>
                <ThemedText style={styles.quakeText}>
                  No recent earthquakes detected.
                </ThemedText>
              </ThemedView>
            )}
            <ThemedView style={styles.stepContainer}>
              <ThemedText type="subtitle">Stay Safe!</ThemedText>
              <ThemedText>
                Make sure you know what to do in case of an earthquake. Stay
                calm and follow safety protocols.
              </ThemedText>
            </ThemedView>
          </ScrollView>
        </>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: "#f5f5f5",
  },
  header: {
    paddingTop: 40,
    paddingBottom: 20,
    paddingHorizontal: 16,
    backgroundColor: "#A1CEDC",
    alignItems: "center",
    borderBottomWidth: 1,
    borderBottomColor: "#ddd",
  },
  stepContainer: {
    gap: 8,
    marginBottom: 8,
    padding: 16,
    backgroundColor: "#f9f9f9",
    borderRadius: 8,
    marginHorizontal: 16,
    marginVertical: 8,
  },
  reactLogo: {
    height: 60,
    width: 100,
    marginBottom: 16,
  },
  scrollViewContent: {
    paddingVertical: 20,
    paddingBottom: 200, // Extra space for info section when an earthquake is selected
  },
  quakeText: {
    color: "#0d2047",
  },
  mapContainer: {
    flex: 1,
    position: "relative", // Ensure positioning context for absolute elements
  },
  map: {
    flex: 1,
  },
  backButton: {
    position: "absolute",
    top: 40,
    left: 16,
    backgroundColor: "#000",
    padding: 10,
    borderRadius: 20,
    zIndex: 10, // Ensure button is above other elements
  },

  // Info section positioned at the bottom of the screen
  infoSection: {
    paddingVertical: 16,
    paddingHorizontal: 16,
    backgroundColor: "#fff",
    borderTopWidth: 1,
    borderTopColor: "#ddd",
    position: "absolute",
    bottom: 0,
    left: 0,
    right: 0,
    marginBottom: 0,
    paddingBottom: 60,
  },

  infoText: {
    color: "#0d2047",
  },
});
