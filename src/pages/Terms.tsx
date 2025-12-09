import { useState } from 'react';
import { Link } from 'react-router-dom';
import ClientHeader from '../components/ClientHeader';
import Footer from '../components/Footer';

export default function Terms() {
  const [language, setLanguage] = useState<'en' | 'es'>('en');

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column' }}>
      <ClientHeader />

      <main style={{ flex: 1, maxWidth: '1000px', margin: '0 auto', padding: '2rem', width: '100%' }}>
        <div style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
          <h1 style={{ fontSize: '36px', fontWeight: 'bold', margin: 0 }}>
            {language === 'en' ? 'Terms of Service' : 'Términos de Servicio'}
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
              <p style={{ marginBottom: '1rem' }}>Welcome to Lupe's Barber Shop. These Terms of Service ("Terms") govern your use of our booking system, website, and services. By accessing or using our services, you agree to be bound by these Terms.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>2. Acceptance of Terms</h2>
              <p style={{ marginBottom: '1rem' }}>By creating an account, booking an appointment, or using our online booking system, you acknowledge that you have read, understood, and agree to be bound by these Terms. If you do not agree to these Terms, please do not use our services.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>3. Use of Services</h2>
              <p style={{ marginBottom: '1rem' }}>Our online booking system allows you to schedule appointments, view services, and communicate with our barbershop. You agree to:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Provide accurate and current information when creating an account or booking appointments</li>
                <li>Maintain the confidentiality of your account credentials</li>
                <li>Notify us immediately of any unauthorized use of your account</li>
                <li>Use the services only for lawful purposes and in accordance with these Terms</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>4. Booking System</h2>
              <p style={{ marginBottom: '1rem' }}>Our booking system is provided as a convenience. While we strive to maintain accurate availability and scheduling information, we reserve the right to modify, cancel, or reschedule appointments as necessary. Specific policies regarding appointments, cancellations, no-shows, and rescheduling are determined at the shop's discretion and may be communicated to you separately.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>5. SMS and Email Communications</h2>
              <p style={{ marginBottom: '1rem' }}>By providing your phone number and email address, you consent to receive:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Appointment confirmations and reminders</li>
                <li>Promotional messages and special offers (you may opt out at any time)</li>
                <li>Service updates and important notices</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>You may opt out of promotional communications by replying STOP to SMS messages or using the unsubscribe link in emails. Transactional messages related to your appointments may still be sent.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>6. Payments</h2>
              <p style={{ marginBottom: '1rem' }}>Payment for services is handled according to the shop's current payment policies. Prices are subject to change without notice. Any payment disputes should be resolved directly with the shop.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>7. Shop Policies</h2>
              <p style={{ marginBottom: '1rem' }}>Lupe's Barber Shop reserves the right to establish and enforce policies regarding cancellations, refunds, no-shows, late arrivals, and other operational matters at its sole discretion. These policies may be communicated through signage, verbal notification, email, SMS, or other means.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>8. Intellectual Property</h2>
              <p style={{ marginBottom: '1rem' }}>All content on our website and booking system, including text, graphics, logos, and software, is the property of Lupe's Barber Shop and is protected by applicable intellectual property laws.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>9. User Conduct</h2>
              <p style={{ marginBottom: '1rem' }}>You agree not to:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Use the services for any illegal or unauthorized purpose</li>
                <li>Attempt to gain unauthorized access to our systems</li>
                <li>Interfere with or disrupt the services</li>
                <li>Transmit any harmful code or malicious software</li>
                <li>Harass, abuse, or harm other users or staff</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>10. Disclaimer of Warranties</h2>
              <p style={{ marginBottom: '1rem' }}>Our services are provided "as is" and "as available" without warranties of any kind, either express or implied. We do not guarantee that the services will be uninterrupted, secure, or error-free.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>11. Limitation of Liability</h2>
              <p style={{ marginBottom: '1rem' }}>To the fullest extent permitted by law, Lupe's Barber Shop shall not be liable for any indirect, incidental, special, consequential, or punitive damages arising from your use of our services, including but not limited to loss of profits, data, or business opportunities.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>12. Indemnification</h2>
              <p style={{ marginBottom: '1rem' }}>You agree to indemnify and hold harmless Lupe's Barber Shop, its owners, employees, and agents from any claims, damages, losses, or expenses arising from your use of the services or violation of these Terms.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>13. Modifications to Terms</h2>
              <p style={{ marginBottom: '1rem' }}>We reserve the right to modify these Terms at any time. Changes will be effective immediately upon posting. Your continued use of the services after changes are posted constitutes acceptance of the modified Terms.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>14. Termination</h2>
              <p style={{ marginBottom: '1rem' }}>We reserve the right to suspend or terminate your access to our services at any time, with or without cause, and with or without notice.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>15. Governing Law</h2>
              <p style={{ marginBottom: '1rem' }}>These Terms shall be governed by and construed in accordance with the laws of the State of Oklahoma, without regard to its conflict of law provisions. Any disputes arising from these Terms or use of our services shall be subject to the exclusive jurisdiction of the courts located in Oklahoma.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>16. Severability</h2>
              <p style={{ marginBottom: '1rem' }}>If any provision of these Terms is found to be invalid or unenforceable, the remaining provisions shall remain in full force and effect.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>17. Entire Agreement</h2>
              <p style={{ marginBottom: '1rem' }}>These Terms constitute the entire agreement between you and Lupe's Barber Shop regarding the use of our services.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>18. Contact Information</h2>
              <p style={{ marginBottom: '0.5rem' }}>If you have any questions about these Terms of Service, please contact us:</p>
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
              <p style={{ marginBottom: '1rem' }}>Bienvenido a Lupe's Barber Shop. Estos Términos de Servicio ("Términos") rigen su uso de nuestro sistema de reservas, sitio web y servicios. Al acceder o utilizar nuestros servicios, usted acepta estar sujeto a estos Términos.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>2. Aceptación de los Términos</h2>
              <p style={{ marginBottom: '1rem' }}>Al crear una cuenta, reservar una cita o utilizar nuestro sistema de reservas en línea, usted reconoce que ha leído, comprendido y acepta estar sujeto a estos Términos. Si no está de acuerdo con estos Términos, por favor no utilice nuestros servicios.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>3. Uso de los Servicios</h2>
              <p style={{ marginBottom: '1rem' }}>Nuestro sistema de reservas en línea le permite programar citas, ver servicios y comunicarse con nuestra barbería. Usted acepta:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Proporcionar información precisa y actualizada al crear una cuenta o reservar citas</li>
                <li>Mantener la confidencialidad de las credenciales de su cuenta</li>
                <li>Notificarnos inmediatamente de cualquier uso no autorizado de su cuenta</li>
                <li>Usar los servicios solo para fines legales y de acuerdo con estos Términos</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>4. Sistema de Reservas</h2>
              <p style={{ marginBottom: '1rem' }}>Nuestro sistema de reservas se proporciona como una conveniencia. Si bien nos esforzamos por mantener información precisa de disponibilidad y programación, nos reservamos el derecho de modificar, cancelar o reprogramar citas según sea necesario. Las políticas específicas con respecto a citas, cancelaciones, ausencias y reprogramaciones se determinan a discreción de la barbería y pueden comunicarse por separado.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>5. Comunicaciones por SMS y Correo Electrónico</h2>
              <p style={{ marginBottom: '1rem' }}>Al proporcionar su número de teléfono y dirección de correo electrónico, usted consiente en recibir:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Confirmaciones y recordatorios de citas</li>
                <li>Mensajes promocionales y ofertas especiales (puede optar por no recibirlos en cualquier momento)</li>
                <li>Actualizaciones de servicio y avisos importantes</li>
              </ul>
              <p style={{ marginBottom: '1rem' }}>Puede optar por no recibir comunicaciones promocionales respondiendo STOP a los mensajes SMS o usando el enlace de cancelación de suscripción en los correos electrónicos. Los mensajes transaccionales relacionados con sus citas aún pueden enviarse.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>6. Pagos</h2>
              <p style={{ marginBottom: '1rem' }}>El pago de los servicios se maneja de acuerdo con las políticas de pago actuales de la barbería. Los precios están sujetos a cambios sin previo aviso. Cualquier disputa de pago debe resolverse directamente con la barbería.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>7. Políticas de la Barbería</h2>
              <p style={{ marginBottom: '1rem' }}>Lupe's Barber Shop se reserva el derecho de establecer y hacer cumplir políticas con respecto a cancelaciones, reembolsos, ausencias, llegadas tardías y otros asuntos operativos a su exclusivo criterio. Estas políticas pueden comunicarse a través de señalización, notificación verbal, correo electrónico, SMS u otros medios.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>8. Propiedad Intelectual</h2>
              <p style={{ marginBottom: '1rem' }}>Todo el contenido de nuestro sitio web y sistema de reservas, incluidos textos, gráficos, logotipos y software, es propiedad de Lupe's Barber Shop y está protegido por las leyes de propiedad intelectual aplicables.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>9. Conducta del Usuario</h2>
              <p style={{ marginBottom: '1rem' }}>Usted acepta no:</p>
              <ul style={{ marginLeft: '2rem', marginBottom: '1rem' }}>
                <li>Usar los servicios para ningún propósito ilegal o no autorizado</li>
                <li>Intentar obtener acceso no autorizado a nuestros sistemas</li>
                <li>Interferir o interrumpir los servicios</li>
                <li>Transmitir ningún código dañino o software malicioso</li>
                <li>Acosar, abusar o dañar a otros usuarios o personal</li>
              </ul>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>10. Descargo de Garantías</h2>
              <p style={{ marginBottom: '1rem' }}>Nuestros servicios se proporcionan "tal cual" y "según disponibilidad" sin garantías de ningún tipo, ya sean expresas o implícitas. No garantizamos que los servicios sean ininterrumpidos, seguros o libres de errores.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>11. Limitación de Responsabilidad</h2>
              <p style={{ marginBottom: '1rem' }}>En la máxima medida permitida por la ley, Lupe's Barber Shop no será responsable de ningún daño indirecto, incidental, especial, consecuente o punitivo que surja de su uso de nuestros servicios, incluidos, entre otros, la pérdida de ganancias, datos u oportunidades comerciales.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>12. Indemnización</h2>
              <p style={{ marginBottom: '1rem' }}>Usted acepta indemnizar y eximir de responsabilidad a Lupe's Barber Shop, sus propietarios, empleados y agentes de cualquier reclamo, daño, pérdida o gasto que surja de su uso de los servicios o violación de estos Términos.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>13. Modificaciones a los Términos</h2>
              <p style={{ marginBottom: '1rem' }}>Nos reservamos el derecho de modificar estos Términos en cualquier momento. Los cambios entrarán en vigencia inmediatamente después de su publicación. Su uso continuo de los servicios después de que se publiquen los cambios constituye la aceptación de los Términos modificados.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>14. Terminación</h2>
              <p style={{ marginBottom: '1rem' }}>Nos reservamos el derecho de suspender o terminar su acceso a nuestros servicios en cualquier momento, con o sin causa, y con o sin previo aviso.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>15. Ley Aplicable</h2>
              <p style={{ marginBottom: '1rem' }}>Estos Términos se regirán e interpretarán de acuerdo con las leyes del Estado de Oklahoma, sin tener en cuenta sus disposiciones sobre conflictos de leyes. Cualquier disputa que surja de estos Términos o del uso de nuestros servicios estará sujeta a la jurisdicción exclusiva de los tribunales ubicados en Oklahoma.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>16. Divisibilidad</h2>
              <p style={{ marginBottom: '1rem' }}>Si alguna disposición de estos Términos se considera inválida o inaplicable, las disposiciones restantes permanecerán en pleno vigor y efecto.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>17. Acuerdo Completo</h2>
              <p style={{ marginBottom: '1rem' }}>Estos Términos constituyen el acuerdo completo entre usted y Lupe's Barber Shop con respecto al uso de nuestros servicios.</p>
            </section>

            <section style={{ marginBottom: '2rem' }}>
              <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '1rem', color: '#000' }}>18. Información de Contacto</h2>
              <p style={{ marginBottom: '0.5rem' }}>Si tiene alguna pregunta sobre estos Términos de Servicio, contáctenos:</p>
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
