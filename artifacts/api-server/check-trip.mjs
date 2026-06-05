import { MongoClient } from 'mongodb';

const uri = "mongodb+srv://vardhan:Vardhan@talentsetu.ohrutcj.mongodb.net/slnlogistics?retryWrites=true&w=majority";

async function checkTrip() {
  const client = new MongoClient(uri);
  try {
    await client.connect();
    const db = client.db();
    
    // Fetch the latest 5 trips, sorted by id or date
    const trips = await db.collection("trips").find().sort({ _id: -1 }).limit(5).toArray();
    
    console.log("Here are the latest trips in MongoDB:");
    console.log(JSON.stringify(trips, null, 2));
    
  } catch (error) {
    console.error("Error connecting to MongoDB:", error);
  } finally {
    await client.close();
  }
}

checkTrip();
