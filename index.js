/**
 * Import function triggers from their respective submodules:
 *

 *
 * See a full list of supported triggers at https://firebase.google.com/docs/functions
 */
 const {onCall} = require("firebase-functions/v2/https");
 const {onDocumentWritten} = require("firebase-functions/v2/firestore");
const {onRequest} = require("firebase-functions/v2/https");
const logger = require("firebase-functions/logger");
const functions = require('firebase-functions');
const admin = require('firebase-admin');
const vision = require('@google-cloud/vision');
const storage = require('@google-cloud/storage');

admin.initializeApp();

// Predefined categories and tags
const categories = {
  'Architecture': ['interior', 'exterior', 'cityscape', 'AerialPhotography', 'details'],
        'SceneryAndEnviroment': ['Seascape', 'Mountainscape', 'Forest', 'Cloudscape', 'Astrophotography',
                                'LongExpoture', 'StraTrail', 'Sunset/Sunrise', 'CityScape'],
        'BasicForms': ['one Sphere object', 'one Cube object', 'one Pyramid object', 'one Cylinder object',
                      'one Cone object', 'Multiple Sphere object', 'Multiple Cube object',
                      'Multiple Pyramid object', 'Multiple Cylinder object', 'Multiple Cone object'],
        'FaceAndExpression': ['Masculine Anger', 'Masculine Contempt',
                             'Masculine Disgust', 'Masculine Fear',
                             'Masculine Happiness', 'Masculine Neutral',
                             'Masculine Silly', 'Masculine Surprise',
                             'Other Masculine human face Expression', 'Feminine Anger',
                             'Feminine Contempt', 'Feminine Disgust',
                             'Feminine Fear', 'Feminine Happiness',
                             'Feminine Neutral', 'Feminine Silly',
                             'Feminine Surprise', 'Other Feminine human face Expression'],
        'StillLife': ['still life with one object', 'still life with multiple objects'],
        'HandsAndFeet': ['Masculine Hands', 'Masculine Feet', 'Feminine Hands', 'Feminine Feet'],
        'Animals': ['Skelton of Felines', 'Skelton of Canine', 'Skelton of Equine & Other Hooved', 'Skelton of Birds',
                   'Skelton of Insects', 'Skelton of Arachnids', 'Skelton of Other Creepy-Crawlers', 'Skelton of Rodent',
                   'Skelton of lupine', 'Skelton of Fuzzies small animals ', 'Skelton of Reptiles &Amphibians ',
                   'Skelton of Aquatic Animals ', 'Skelton of Primates. Felines, Canine, Equine & Other Hooved, Birds, Insects, Arachnids',
                   'Other Creepy-Crawlers, Rodent , lupine, Other Fuzzies small animals, Reptiles & Amphibians ',
                   'Aquatic Animals, Primates'],
        'FigureDrawing': ['Fully clothed Masculine Baby', 'Fully clothed Masculine teen', 'Fully clothed Masculine YoungAdult',
                         'Fully clothed Masculine Adult', 'Fully clothed Masculine OldAdult', 'Fully clothed Feminine Baby',
                         'Fully clothed Feminine teen', 'Fully clothed Feminine YoungAdult', 'Fully clothed Feminine Adult',
                         'Fully clothed Feminine OldAdult', 'Fully clothed Non-binary Baby', 'Fully clothed Non-binary teen',
                         'Fully clothed Non-binary YoungAdult', 'Fully clothed Non-binary Adult', 'Fully clothed Non-binary OldAdult ',
                         'Partial clothed Masculine Baby', 'Partial clothed Masculine teen', 'Partial clothed Masculine YoungAdult',
                         'Partial clothed Masculine Adult ', 'Partial clothed Masculine OldAdult', 'Partial clothed Feminine Baby',
                         'Partial clothed Feminine teen ', 'Partial clothed Feminine YoungAdult', 'Partial clothed Feminine Adult',
                         'Partial clothed Feminine OldAdult', 'Partial clothed Non-binary Baby', 'Partial clothed Non-binary teen',
                         'Partial clothed Non-binary YoungAdult', 'Partial clothed Non-binary Adult ', 'Partial clothed Non-binary OldAdult',
                         'Nude Masculine Baby', 'Nude Masculine teen', 'Nude Masculine YoungAdult', 'Nude Masculine Adult',
                         'Nude Masculine OldAdult', 'Nude Feminine Baby', 'Nude Feminine teen', 'Nude Feminine YoungAdult',
                         'Nude Feminine Adult', 'Nude Feminine OldAdult', 'Nude Non-binary Baby', 'Nude Non-binary teen ',
                         'Nude Non-binary YoungAdult', 'Nude Non-binary Adult ', 'Nude Non-binary OldAdult']
  // Add more categories here
};

// Cloud Vision client
const client = new vision.ImageAnnotatorClient();

// Trigger function for image upload
exports.processImageUpload = functions.storage.object().onFinalize(async (object) => {
  const bucket = storage.bucket(object.bucket);
  const filePath = object.name;
  const fileName = filePath.split('/').pop();
  const fileUrl = `https://storage.googleapis.com/${object.bucket}/${filePath}`;

  // Get image ID and other properties
  const imageId = object.id;

  try {
    // Use Google Cloud Vision to detect labels in the image
    const [result] = await client.labelDetection(`gs://${object.bucket}/${filePath}`);
    const labels = result.labelAnnotations;

    // Assign category_id and tags based on labels
    let category_id = null;
    let tags = [];

    // Loop through labels and map them to categories
    labels.forEach((label) => {
      // Check for a predefined category match
      for (let [category, categoryTags] of Object.entries(categories)) {
        if (categoryTags.includes(label.description.toLowerCase())) {
          category_id = category;
          tags.push(label.description);
        }
      }
    });

    // If no category is matched, assign a default category or logic
    if (!category_id) {
      category_id = 0; // Default or 'Uncategorized'
    }

    // Store metadata in Firestore
    const docRef = admin.firestore().collection('images').doc(imageId);

    await docRef.set({
      ImageUrl: fileUrl,
      category_id: category_id,
      tags: tags,
      image_id: imageId,
      created_at: admin.firestore.FieldValue.serverTimestamp(),
    });

    console.log('Document created successfully in Firestore');
  } catch (error) {
    console.error('Error processing image:', error);
  }
});

// Create and deploy your first functions
// https://firebase.google.com/docs/functions/get-started

// exports.helloWorld = onRequest((request, response) => {
//   logger.info("Hello logs!", {structuredData: true});
//   response.send("Hello from Firebase!");
// });
