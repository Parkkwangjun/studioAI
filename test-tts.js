const { TextToSpeechClient } = require('@google-cloud/text-to-speech');
const fs = require('fs');
const path = require('path');

async function testGoogleTTS() {
    try {
        console.log('=== Google TTS Test ===\n');

        // Check environment variable
        const credentialsPath = process.env.GOOGLE_APPLICATION_CREDENTIALS;
        console.log('1. Checking credentials path...');
        console.log('   GOOGLE_APPLICATION_CREDENTIALS:', credentialsPath);

        if (!credentialsPath) {
            throw new Error('GOOGLE_APPLICATION_CREDENTIALS is not set');
        }

        // Check if file exists
        console.log('\n2. Checking if credentials file exists...');
        if (!fs.existsSync(credentialsPath)) {
            throw new Error(`Credentials file not found: ${credentialsPath}`);
        }
        console.log('   ✓ File exists');

        // Try to read and parse JSON
        console.log('\n3. Validating JSON file...');
        const jsonContent = fs.readFileSync(credentialsPath, 'utf8');
        const credentials = JSON.parse(jsonContent);
        console.log('   ✓ Valid JSON');
        console.log('   Project ID:', credentials.project_id);
        console.log('   Client Email:', credentials.client_email);

        // Initialize client
        console.log('\n4. Initializing TTS client...');
        const client = new TextToSpeechClient({
            keyFilename: credentialsPath
        });
        console.log('   ✓ Client initialized');

        // Test synthesis
        console.log('\n5. Testing speech synthesis...');
        const [response] = await client.synthesizeSpeech({
            input: { text: '안녕하세요, 테스트입니다.' },
            voice: {
                languageCode: 'ko-KR',
                name: 'ko-KR-Neural2-A'
            },
            audioConfig: {
                audioEncoding: 'MP3',
                speakingRate: 1.0
            },
        });

        console.log('   ✓ Synthesis successful');
        console.log('   Audio content size:', response.audioContent?.length || 0, 'bytes');

        // Save test file
        const outputPath = path.join(__dirname, 'test-output.mp3');
        fs.writeFileSync(outputPath, response.audioContent);
        console.log('   ✓ Test audio saved to:', outputPath);

        console.log('\n=== ✅ ALL TESTS PASSED ===\n');

    } catch (error) {
        console.error('\n=== ❌ TEST FAILED ===');
        console.error('Error:', error.message);
        console.error('\nFull error:', error);
        process.exit(1);
    }
}

testGoogleTTS();
