import { useState } from 'react';
import { Link } from 'react-router-dom';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

export default function Privacy() {
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ClientHeader />

      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '2rem', width: '100%' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
            {language === 'en' ? 'Privacy Policy' : 'Política de Privacidad'}
          </h1>
          <div style={{ display: 'flex', gap: '0.5rem' }}>
            <button
              onClick={() => setLanguage('en')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: language === 'en' ? '#000' : 'white',
                color: language === 'en' ? 'white' : '#000',
                border: '2px solid #000',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              EN
            </button>
            <button
              onClick={() => setLanguage('es')}
              style={{
                padding: '0.5rem 1rem',
                backgroundColor: language === 'es' ? '#000' : 'white',
                color: language === 'es' ? 'white' : '#000',
                border: '2px solid #000',
                borderRadius: '6px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: '600',
                transition: 'all 0.2s',
              }}
            >
              ES
            </button>
          </div>
        </div>

        {language === 'en' ? (
          <div style={{ lineHeight: '1.8', color: '#333' }}>
            <p style={{ marginBottom: '1.5rem', fontSize: '16px', color: '#666' }}>
              <strong>Lupe's Barber Shop</strong><br />
              <strong>Effective Date: December 9, 2025</strong>
            </p>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>1. Introduction</h2>
              <p style={{ marginBottom: '1rem' }}>Lupe's Barber Shop ("we," "our," or "us") respects your privacy. This Privacy Policy explains how we collect, use, disclose, and protect your personal information when you use our booking system and services.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>2. Information We Collect</h2>
              <p style={{ marginBottom: '1rem' }}>We collect information that you provide directly to us, including:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Personal Information:</strong> Name, email address, phone number</li>
                <li><strong>Appointment Information:</strong> Service preferences, appointment dates and times, barber preferences</li>
                <li><strong>Account Information:</strong> Username, password (encrypted), account preferences</li>
                <li><strong>Communication Data:</strong> Messages, feedback, and correspondence with us</li>
                <li><strong>Payment Information:</strong> Limited payment data as necessary for transactions (payment processing may be handled by third parties)</li>
                <li><strong>Technical Information:</strong> IP address, browser type, device information, and usage data collected automatically</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>3. How We Use Your Information</h2>
              <p style={{ marginBottom: '1rem' }}>We use the information we collect to:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Schedule, confirm, and manage appointments</li>
                <li>Send appointment reminders via SMS and email</li>
                <li>Process payments for services</li>
                <li>Communicate with you about services, promotions, and updates</li>
                <li>Improve our services and customer experience</li>
                <li>Comply with legal obligations</li>
                <li>Prevent fraud and maintain security</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>4. SMS and Email Communications</h2>
              <p style={{ marginBottom: '1rem' }}>By providing your phone number and email address, you explicitly consent to receive:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Transactional Communications:</strong> Appointment confirmations, reminders, and updates</li>
                <li><strong>Promotional Communications:</strong> Special offers, promotions, and marketing messages (optional)</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>You have the right to opt out of promotional communications at any time by:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Replying STOP to SMS messages</li>
                <li>Clicking the unsubscribe link in emails</li>
                <li>Contacting us directly</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Please note that even if you opt out of promotional communications, we may still send you transactional messages related to your appointments and account.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>5. How We Share Your Information</h2>
              <p style={{ marginBottom: '1rem' }}>We do not sell your personal information. We may share your information with:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Service Providers:</strong> Third-party vendors who assist with hosting, SMS delivery, email services, payment processing, and other operational functions</li>
                <li><strong>Legal Requirements:</strong> When required by law, court order, or government regulation</li>
                <li><strong>Business Transfers:</strong> In connection with a merger, sale, or transfer of business assets</li>
                <li><strong>With Your Consent:</strong> When you explicitly authorize us to share your information</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>6. Third-Party Services</h2>
              <p style={{ marginBottom: '1rem' }}>Our services may use third-party platforms for:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Website hosting and cloud infrastructure</li>
                <li>SMS and email delivery services</li>
                <li>Payment processing</li>
                <li>Analytics and performance monitoring</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>These third parties have their own privacy policies, and we encourage you to review them. We are not responsible for the privacy practices of third-party services.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>7. Data Retention</h2>
              <p style={{ marginBottom: '1rem' }}>We retain your personal information for as long as necessary to:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Provide you with services</li>
                <li>Comply with legal obligations</li>
                <li>Resolve disputes</li>
                <li>Enforce our Terms of Service</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>You may request deletion of your account and personal information at any time, subject to legal retention requirements.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>8. Your Rights</h2>
              <p style={{ marginBottom: '1rem' }}>Depending on your location, you may have certain rights regarding your personal information, including:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Access:</strong> Request access to the personal information we hold about you</li>
                <li><strong>Correction:</strong> Request correction of inaccurate or incomplete information</li>
                <li><strong>Deletion:</strong> Request deletion of your personal information</li>
                <li><strong>Opt-Out:</strong> Opt out of promotional communications</li>
                <li><strong>Portability:</strong> Request a copy of your data in a portable format</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>To exercise these rights, please contact us using the information below.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>9. Security</h2>
              <p style={{ marginBottom: '1rem' }}>We implement reasonable security measures to protect your personal information from unauthorized access, disclosure, alteration, or destruction. However, no method of transmission over the internet or electronic storage is 100% secure, and we cannot guarantee absolute security.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>10. Children's Privacy</h2>
              <p style={{ marginBottom: '1rem' }}>Our services are not directed to individuals under the age of 13. We do not knowingly collect personal information from children. If we become aware that we have collected information from a child under 13, we will take steps to delete it promptly.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>11. California Privacy Rights</h2>
              <p style={{ marginBottom: '1rem' }}>If you are a California resident, you may have additional rights under the California Consumer Privacy Act (CCPA), including the right to know what personal information we collect and the right to request deletion of your information.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>12. Changes to This Privacy Policy</h2>
              <p style={{ marginBottom: '1rem' }}>We may update this Privacy Policy from time to time. Changes will be posted on this page with an updated effective date. Your continued use of our services after changes are posted constitutes acceptance of the updated Privacy Policy.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>13. Contact Information</h2>
              <p style={{ marginBottom: '0.5rem' }}>If you have any questions, concerns, or requests regarding this Privacy Policy or your personal information, please contact us:</p>
              <p style={{ marginBottom: '0.5rem' }}><strong>Lupe's Barber Shop</strong></p>
              <p style={{ marginBottom: '0.5rem' }}>Owner: Guadalupe Rodriguez Mendoza</p>
              <p style={{ marginBottom: '0.5rem' }}>Email: lupesbarbershop2025@gmail.com</p>
              <p style={{ marginBottom: '0.5rem' }}>Phone: (405) 687-9956</p>
              <p style={{ marginBottom: '1rem' }}>Address: 121 S Choctaw Ave Suite C, El Reno, OK 73036</p>
            </section>
          </div>
        ) : (
          <div style={{ lineHeight: '1.8', color: '#333' }}>
            <p style={{ marginBottom: '1.5rem', fontSize: '16px', color: '#666' }}>
              <strong>Lupe's Barber Shop</strong><br />
              <strong>Fecha de Vigencia: 9 de diciembre de 2025</strong>
            </p>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>1. Introducción</h2>
              <p style={{ marginBottom: '1rem' }}>Lupe's Barber Shop ("nosotros", "nuestro" o "nos") respeta su privacidad. Esta Política de Privacidad explica cómo recopilamos, usamos, divulgamos y protegemos su información personal cuando utiliza nuestro sistema de reservas y servicios.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>2. Información que Recopilamos</h2>
              <p style={{ marginBottom: '1rem' }}>Recopilamos información que usted nos proporciona directamente, incluyendo:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Información Personal:</strong> Nombre, dirección de correo electrónico, número de teléfono</li>
                <li><strong>Información de Citas:</strong> Preferencias de servicio, fechas y horas de citas, preferencias de barbero</li>
                <li><strong>Información de Cuenta:</strong> Nombre de usuario, contraseña (encriptada), preferencias de cuenta</li>
                <li><strong>Datos de Comunicación:</strong> Mensajes, comentarios y correspondencia con nosotros</li>
                <li><strong>Información de Pago:</strong> Datos de pago limitados según sea necesario para las transacciones (el procesamiento de pagos puede ser manejado por terceros)</li>
                <li><strong>Información Técnica:</strong> Dirección IP, tipo de navegador, información del dispositivo y datos de uso recopilados automáticamente</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>3. Cómo Usamos su Información</h2>
              <p style={{ marginBottom: '1rem' }}>Usamos la información que recopilamos para:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Programar, confirmar y gestionar citas</li>
                <li>Enviar recordatorios de citas por SMS y correo electrónico</li>
                <li>Procesar pagos por servicios</li>
                <li>Comunicarnos con usted sobre servicios, promociones y actualizaciones</li>
                <li>Mejorar nuestros servicios y la experiencia del cliente</li>
                <li>Cumplir con obligaciones legales</li>
                <li>Prevenir fraudes y mantener la seguridad</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>4. Comunicaciones por SMS y Correo Electrónico</h2>
              <p style={{ marginBottom: '1rem' }}>Al proporcionar su número de teléfono y dirección de correo electrónico, usted consiente explícitamente en recibir:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Comunicaciones Transaccionales:</strong> Confirmaciones de citas, recordatorios y actualizaciones</li>
                <li><strong>Comunicaciones Promocionales:</strong> Ofertas especiales, promociones y mensajes de marketing (opcional)</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Tiene derecho a optar por no recibir comunicaciones promocionales en cualquier momento:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Respondiendo STOP a los mensajes SMS</li>
                <li>Haciendo clic en el enlace de cancelación de suscripción en los correos electrónicos</li>
                <li>Contactándonos directamente</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Tenga en cuenta que incluso si opta por no recibir comunicaciones promocionales, aún podemos enviarle mensajes transaccionales relacionados con sus citas y cuenta.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>5. Cómo Compartimos su Información</h2>
              <p style={{ marginBottom: '1rem' }}>No vendemos su información personal. Podemos compartir su información con:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Proveedores de Servicios:</strong> Proveedores externos que ayudan con alojamiento, entrega de SMS, servicios de correo electrónico, procesamiento de pagos y otras funciones operativas</li>
                <li><strong>Requisitos Legales:</strong> Cuando lo requiera la ley, orden judicial o regulación gubernamental</li>
                <li><strong>Transferencias Comerciales:</strong> En conexión con una fusión, venta o transferencia de activos comerciales</li>
                <li><strong>Con su Consentimiento:</strong> Cuando usted nos autorice explícitamente a compartir su información</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>6. Servicios de Terceros</h2>
              <p style={{ marginBottom: '1rem' }}>Nuestros servicios pueden usar plataformas de terceros para:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Alojamiento web e infraestructura en la nube</li>
                <li>Servicios de entrega de SMS y correo electrónico</li>
                <li>Procesamiento de pagos</li>
                <li>Análisis y monitoreo de rendimiento</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Estos terceros tienen sus propias políticas de privacidad y le recomendamos que las revise. No somos responsables de las prácticas de privacidad de los servicios de terceros.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>7. Retención de Datos</h2>
              <p style={{ marginBottom: '1rem' }}>Conservamos su información personal durante el tiempo necesario para:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Proporcionarle servicios</li>
                <li>Cumplir con obligaciones legales</li>
                <li>Resolver disputas</li>
                <li>Hacer cumplir nuestros Términos de Servicio</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Puede solicitar la eliminación de su cuenta e información personal en cualquier momento, sujeto a requisitos legales de retención.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>8. Sus Derechos</h2>
              <p style={{ marginBottom: '1rem' }}>Dependiendo de su ubicación, puede tener ciertos derechos con respecto a su información personal, incluyendo:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li><strong>Acceso:</strong> Solicitar acceso a la información personal que tenemos sobre usted</li>
                <li><strong>Corrección:</strong> Solicitar la corrección de información inexacta o incompleta</li>
                <li><strong>Eliminación:</strong> Solicitar la eliminación de su información personal</li>
                <li><strong>Exclusión:</strong> Optar por no recibir comunicaciones promocionales</li>
                <li><strong>Portabilidad:</strong> Solicitar una copia de sus datos en un formato portable</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Para ejercer estos derechos, contáctenos usando la información a continuación.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>9. Seguridad</h2>
              <p style={{ marginBottom: '1rem' }}>Implementamos medidas de seguridad razonables para proteger su información personal del acceso, divulgación, alteración o destrucción no autorizados. Sin embargo, ningún método de transmisión por Internet o almacenamiento electrónico es 100% seguro, y no podemos garantizar la seguridad absoluta.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>10. Privacidad de los Niños</h2>
              <p style={{ marginBottom: '1rem' }}>Nuestros servicios no están dirigidos a personas menores de 13 años. No recopilamos conscientemente información personal de niños. Si nos damos cuenta de que hemos recopilado información de un niño menor de 13 años, tomaremos medidas para eliminarla de inmediato.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>11. Derechos de Privacidad de California</h2>
              <p style={{ marginBottom: '1rem' }}>Si es residente de California, puede tener derechos adicionales bajo la Ley de Privacidad del Consumidor de California (CCPA), incluido el derecho a saber qué información personal recopilamos y el derecho a solicitar la eliminación de su información.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>12. Cambios a esta Política de Privacidad</h2>
              <p style={{ marginBottom: '1rem' }}>Podemos actualizar esta Política de Privacidad de vez en cuando. Los cambios se publicarán en esta página con una fecha de vigencia actualizada. Su uso continuo de nuestros servicios después de que se publiquen los cambios constituye la aceptación de la Política de Privacidad actualizada.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>13. Información de Contacto</h2>
              <p style={{ marginBottom: '0.5rem' }}>Si tiene alguna pregunta, inquietud o solicitud con respecto a esta Política de Privacidad o su información personal, contáctenos:</p>
              <p style={{ marginBottom: '0.5rem' }}><strong>Lupe's Barber Shop</strong></p>
              <p style={{ marginBottom: '0.5rem' }}>Propietario: Guadalupe Rodriguez Mendoza</p>
              <p style={{ marginBottom: '0.5rem' }}>Correo Electrónico: lupesbarbershop2025@gmail.com</p>
              <p style={{ marginBottom: '0.5rem' }}>Teléfono: (405) 687-9956</p>
              <p style={{ marginBottom: '1rem' }}>Dirección: 121 S Choctaw Ave Suite C, El Reno, OK 73036</p>
            </section>
          </div>
        )}

        <div style={{ marginTop: '3rem', padding: '1rem', backgroundColor: '#f0f0f0', borderRadius: '8px', textAlign: 'center' }}>
          <Link
            to="/client/home"
            style={{
              color: '#000',
              textDecoration: 'none',
              fontSize: '16px',
              fontWeight: '600',
            }}
          >
            {language === 'en' ? '← Back to Home' : '← Volver al Inicio'}
          </Link>
        </div>
      </main>

      <Footer />
    </div>
  );
}
