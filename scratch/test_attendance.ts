import { dbConnect } from "../lib/mongodb";
import { BusinessLabour } from "../models/BusinessLabour";
import mongoose from "mongoose";

async function run() {
  await dbConnect();
  console.log("Connected");
  const l = await BusinessLabour.findOne();
  if (l) {
    console.log("Labour ID:", l._id);
  } else {
    console.log("No labour found");
  }
  mongoose.disconnect();
}
run();
