/**
 * Optional Secure Backend Proxy Server (Node.js + Express + MQTT)
 * 
 * Provides an authenticated backend API to handle control commands securely
 * without exposing MQTT broker credentials or topics directly to client browsers.
 */

const express = require('express');
const mqtt = require('mqtt');
const cors = require('cors');

const app = express();
app.use(express.json());
app.use(cors());

// Configure your private MQTT Broker credentials here or via environment variables
const MQTT_BROKER = process.env.MQTT_BROKER || 'wss://broker.hivemq.com:8884/mqtt';
const MQTT_USER = process.env.MQTT_USER || '';
const MQTT_PASS = process.env.MQTT_PASS || '';
const DEVICE_NAMESPACE = process.env.DEVICE_NAMESPACE || 'secure-home-namespace';

const client = mqtt.connect(MQTT_BROKER, {
    username: MQTT_USER,
    password: MQTT_PASS,
    clientId: 'secureBackend-' + Math.random().toString(36).substring(2, 10)
});

client.on('connect', () => {
    console.log('✅ Backend successfully connected to MQTT broker');
});

client.on('error', (err) => {
    console.error('❌ MQTT Broker Connection Error:', err);
});

// Secure API Endpoint for controlling devices
app.post('/api/control', (req, res) => {
    const { device, state, secretToken } = req.body;

    // 1. Validate Authentication Token (Example simple token check)
    const AUTH_SECRET = process.env.AUTH_SECRET || 'my-super-secret-token';
    if (secretToken !== AUTH_SECRET) {
        return res.status(401).json({ error: 'Unauthorized: Invalid authentication token' });
    }

    // 2. Strict Server-Side Input Validation
    const validDevices = ['bulb', 'plug', 'fan'];
    const validStates = ['ON', 'OFF'];

    if (!validDevices.includes(device) || !validStates.includes(state)) {
        return res.status(400).json({ error: 'Invalid device or state parameter' });
    }

    // 3. Obfuscated Topic Routing
    const topic = `home/v1/${DEVICE_NAMESPACE}/control/${device}`;
    
    client.publish(topic, state, { qos: 1 }, (err) => {
        if (err) {
            console.error('Failed to publish command:', err);
            return res.status(500).json({ error: 'Failed to transmit MQTT command' });
        }
        console.log(`[SECURE API] Published "${state}" to topic: ${topic}`);
        return res.json({ success: true, device, state, topic });
    });
});

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`🔒 Secure Switchgen Proxy Server running on http://localhost:${PORT}`);
});
