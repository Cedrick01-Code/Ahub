import mongoose from 'mongoose';

export const connectDB = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) throw new Error('MONGODB_URI is required. Configure it in the backend environment before starting AHub.');

  mongoose.set('strictQuery', true);

  await mongoose.connect(uri, {
    serverSelectionTimeoutMS: Number(process.env.MONGO_SELECTION_TIMEOUT_MS || 8000),
    connectTimeoutMS: Number(process.env.MONGO_CONNECT_TIMEOUT_MS || 8000),
    maxPoolSize: Number(process.env.MONGO_MAX_POOL_SIZE || 20),
  });

  console.log(`MongoDB connected: ${mongoose.connection.host}/${mongoose.connection.name}`);
};
