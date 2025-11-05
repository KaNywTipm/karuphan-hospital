/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    // เลือกอย่างใดอย่างหนึ่ง: remotePatterns (ยืดหยุ่น) หรือ domains (สั้น)
    remotePatterns: [
      // UploadThing / utfs.io
      { protocol: "https", hostname: "utfs.io" },
      { protocol: "https", hostname: "*.uploadthing.com" },

      // ตัวอย่าง S3 / CloudFront ของคุณ
      // { protocol: "https", hostname: "your-bucket.s3.ap-southeast-1.amazonaws.com" },
      // { protocol: "https", hostname: "cdn.your-domain.com" },

      // ตัวอย่าง Supabase Storage
      // { protocol: "https", hostname: "*.supabase.co" },
    ],

    // ถ้าชอบแบบสั้น (match ทั้งโดเมนตรง ๆ) ใช้แทนได้:
    // domains: ["utfs.io", "your-bucket.s3.ap-southeast-1.amazonaws.com", "cdn.your-domain.com"],
  },
};

module.exports = nextConfig;
