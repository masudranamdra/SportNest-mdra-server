require('dotenv').config();
const mongoose = require('mongoose');
const Facility = require('./models/Facility');

const seedFacilities = [
  {
    name: "Old Dhaka Arena",
    facility_type: "football",
    image: "https://images.unsplash.com/photo-1508098682722-e99c43a406b2?auto=format&fit=crop&q=80&w=800",
    location: "Lalbagh, Dhaka",
    price_per_hour: 2500,
    capacity: 14,
    available_slots: ["08:00 - 09:00", "09:00 - 10:00", "15:00 - 16:00", "16:00 - 17:00", "18:00 - 19:00", "19:00 - 20:00"],
    description: "Premium artificial turf imported from Germany, offering perfect bounce and dynamic player movement. Features floodlights, locker rooms, and spectator seating for 50+ fans.",
    owner_email: "owner@sportnest.com"
  },
  {
    name: "Mirpur Green Lane nets",
    facility_type: "cricket",
    image: "https://images.unsplash.com/photo-1531415080290-bc98545ab5fc?auto=format&fit=crop&q=80&w=800",
    location: "Mirpur 2, Dhaka",
    price_per_hour: 1800,
    capacity: 22,
    available_slots: ["07:00 - 08:00", "10:00 - 11:00", "14:00 - 15:00", "16:00 - 17:00", "17:00 - 18:00"],
    description: "Equipped with professional bowling machines, indoor AstroTurf pitches, and safety netting nets. Perfect for batting practice and team drills under certified coaches.",
    owner_email: "owner@sportnest.com"
  },
  {
    name: "Dhanmondi Indoor Badminton Club",
    facility_type: "badminton",
    image: "https://images.unsplash.com/photo-1626224583764-f87db24ac4ea?auto=format&fit=crop&q=80&w=800",
    location: "Dhanmondi 27, Dhaka",
    price_per_hour: 1200,
    capacity: 4,
    available_slots: ["09:00 - 10:00", "11:00 - 12:00", "13:00 - 14:00", "18:00 - 19:00", "20:00 - 21:00", "21:00 - 22:00"],
    description: "Features high-grade shock-absorbing rubber flooring and low-glare LED spotlights. Offers professional Yonex badminton nets and carbon rackets on hire.",
    owner_email: "owner@sportnest.com"
  },
  {
    name: "Gulshan Clay Tennis Courts",
    facility_type: "tennis",
    image: "https://images.unsplash.com/photo-1595435934249-5df7ed86e1c0?auto=format&fit=crop&q=80&w=800",
    location: "Gulshan 2, Dhaka",
    price_per_hour: 3000,
    capacity: 4,
    available_slots: ["06:00 - 07:00", "08:00 - 09:00", "16:00 - 17:00", "17:00 - 18:00", "19:00 - 20:00"],
    description: "Prisinte standard red clay courts offering excellent slide and spin metrics. Includes court sweepers, rest pavilions, and professional ball boy support.",
    owner_email: "owner@sportnest.com"
  },
  {
    name: "Banani Hardwood Court",
    facility_type: "basketball",
    image: "https://images.unsplash.com/photo-1546519638-68e109498ffc?auto=format&fit=crop&q=80&w=800",
    location: "Banani, Dhaka",
    price_per_hour: 2000,
    capacity: 10,
    available_slots: ["08:00 - 09:00", "12:00 - 13:00", "14:00 - 15:00", "17:00 - 18:00", "19:00 - 20:00", "20:00 - 21:00"],
    description: "Olympic-standard indoor maple hardwood floor, fully climatized. Features adjustable height glass backboards, electronic scoreboards, and training equipment.",
    owner_email: "owner@sportnest.com"
  },
  {
    name: "Uttara Splash Olympic Pool",
    facility_type: "swimming",
    image: "https://images.unsplash.com/photo-1576013551627-0cc20b96c2a7?auto=format&fit=crop&q=80&w=800",
    location: "Uttara Sector 11, Dhaka",
    price_per_hour: 3500,
    capacity: 30,
    available_slots: ["06:00 - 07:00", "09:00 - 10:00", "11:00 - 12:00", "15:00 - 16:00", "17:00 - 18:00", "18:00 - 19:00"],
    description: "A pristine 50-meter Olympic swimming pool featuring 8 divided swim lanes, complete water chlorination filtration systems, and professional lifeguard standouts.",
    owner_email: "owner@sportnest.com"
  }
];

const seedDB = async () => {
  try {
    console.log('Connecting to MongoDB Atlas...');
    await mongoose.connect(process.env.MONGODB_URI);
    console.log('Connected successfully!');

    console.log('Clearing existing facilities collection...');
    await Facility.deleteMany({});
    console.log('Facilities collection cleared.');

    console.log('Seeding new sports facilities...');
    const createdFacilities = await Facility.insertMany(seedFacilities);
    console.log(`Successfully seeded ${createdFacilities.length} premium sports facilities!`);

    mongoose.connection.close();
    console.log('Database connection closed safely. Seeding complete!');
    process.exit(0);
  } catch (error) {
    console.error(`Database seeding failed: ${error.message}`);
    process.exit(1);
  }
};

seedDB();
