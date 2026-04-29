import { sendWhatsAppMessage } from '../src/modules/notifications/whatsapp';
import * as dotenv from 'dotenv';
dotenv.config();

async function run() {
  console.log("Testing WhatsApp Evolution API with real number...");
  try {
    const env = {
      WHATSAPP_API_TYPE: process.env.WHATSAPP_API_TYPE,
      WHATSAPP_API_URL: process.env.WHATSAPP_API_URL,
      WHATSAPP_API_KEY: process.env.WHATSAPP_API_KEY,
      WHATSAPP_INSTANCE_NAME: process.env.WHATSAPP_INSTANCE_NAME,
    } as any;

    const phone = process.env.ZE_PHONE;
    if (!phone) throw new Error("ZE_PHONE not defined in .env");
    console.log(`Sending message to: ${phone}`);
    
    await sendWhatsAppMessage(env, phone, "🌿 Olá Zé Paulo! Esta é uma mensagem de teste da Lojinha do Zé. Sua integração com WhatsApp está ATIVA e FUNCIONANDO! 🚀");
    
    console.log("Success! Check your WhatsApp.");
  } catch (error) {
    console.error("Error testing:", error);
  }
}

run();
