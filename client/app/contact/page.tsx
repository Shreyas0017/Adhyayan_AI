"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Mail, Phone, MapPin, Clock, Send, CheckCircle, AlertCircle } from "lucide-react"
import { sendContactEmail } from "./action"

export default function ContactPage() {
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [submitStatus, setSubmitStatus] = useState<{
    type: "success" | "error" | null
    message: string
  }>({ type: null, message: "" })

  const handleSubmit = async (formData: FormData) => {
    setIsSubmitting(true)
    setSubmitStatus({ type: null, message: "" })

    try {
      const result = await sendContactEmail(formData)

      if (result.success) {
        setSubmitStatus({
          type: "success",
          message: "Thank you! Your message has been sent successfully. We'll get back to you soon.",
        })
        // Reset form
        const form = document.getElementById("contact-form") as HTMLFormElement
        form?.reset()
      } else {
        setSubmitStatus({
          type: "error",
          message: result.message || "Something went wrong. Please try again.",
        })
      }
    } catch (error) {
      setSubmitStatus({
        type: "error",
        message: "Network error. Please check your connection and try again.",
      })
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-black text-white relative overflow-hidden">
      {/* Background Pattern - matching your website's geometric pattern */}
      <div className="absolute inset-0 opacity-5">
        <div
          className="absolute inset-0"
          style={{
            backgroundImage: `url("data:image/svg+xml,%3Csvg width='60' height='60' viewBox='0 0 60 60' xmlns='http://www.w3.org/2000/svg'%3E%3Cg fill='none' fillRule='evenodd'%3E%3Cg fill='%23ffffff' fillOpacity='0.1'%3E%3Cpath d='m36 34v-4h-2v4h-4v2h4v4h2v-4h4v-2h-4zm0-30V0h-2v4h-4v2h4v4h2V6h4V4h-4zM6 34v-4H4v4H0v2h4v4h2v-4h4v-2H6zM6 4V0H4v4H0v2h4v4h2V6h4V4H6z'/%3E%3C/g%3E%3C/g%3E%3C/svg%3E")`,
          }}
        />
      </div>

      {/* Header Section */}
      <div className="relative z-10 py-20 text-center">
        <h1 className="text-6xl font-bold mb-6">संपर्क करें</h1>
        <p className="text-2xl text-gray-300 max-w-3xl mx-auto px-4">
          हमसे जुड़ें • आपके प्रश्नों का स्वागत है • सहायता के लिए संपर्क करें
        </p>
      </div>

      <div className="relative z-10 container mx-auto px-4 pb-16">
        <div className="grid lg:grid-cols-2 gap-12 max-w-6xl mx-auto">
          {/* Contact Form */}
          <div>
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-2xl">Send us a message</CardTitle>
                <CardDescription className="text-gray-400">
                  Fill out the form below and we'll get back to you as soon as possible.
                </CardDescription>
              </CardHeader>
              <CardContent>
                {/* Status Messages */}
                {submitStatus.type && (
                  <div
                    className={`mb-6 p-4 rounded-lg border ${
                      submitStatus.type === "success"
                        ? "bg-green-900/20 border-green-700 text-green-300"
                        : "bg-red-900/20 border-red-700 text-red-300"
                    }`}
                  >
                    <div className="flex items-center space-x-2">
                      {submitStatus.type === "success" ? (
                        <CheckCircle className="h-5 w-5" />
                      ) : (
                        <AlertCircle className="h-5 w-5" />
                      )}
                      <p>{submitStatus.message}</p>
                    </div>
                  </div>
                )}

                <form id="contact-form" action={handleSubmit} className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="firstName" className="text-gray-200">
                        First Name *
                      </Label>
                      <Input
                        id="firstName"
                        name="firstName"
                        placeholder="Enter your first name"
                        required
                        className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="lastName" className="text-gray-200">
                        Last Name *
                      </Label>
                      <Input
                        id="lastName"
                        name="lastName"
                        placeholder="Enter your last name"
                        required
                        className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="email" className="text-gray-200">
                      Email *
                    </Label>
                    <Input
                      id="email"
                      name="email"
                      type="email"
                      placeholder="Enter your email address"
                      required
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="phone" className="text-gray-200">
                      Phone Number
                    </Label>
                    <Input
                      id="phone"
                      name="phone"
                      type="tel"
                      placeholder="Enter your phone number"
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="subject" className="text-gray-200">
                      Subject *
                    </Label>
                    <Input
                      id="subject"
                      name="subject"
                      placeholder="What is this regarding?"
                      required
                      className="bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                    />
                  </div>

                  <div className="space-y-2">
                    <Label htmlFor="message" className="text-gray-200">
                      Message *
                    </Label>
                    <Textarea
                      id="message"
                      name="message"
                      placeholder="Tell us more about your inquiry..."
                      className="min-h-[120px] bg-black/50 border-gray-700 text-white placeholder:text-gray-500 focus:border-gray-500 focus:ring-gray-500"
                      required
                    />
                  </div>

                  <Button
                    type="submit"
                    disabled={isSubmitting}
                    className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 disabled:opacity-50"
                  >
                    {isSubmitting ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                        Sending...
                      </>
                    ) : (
                      <>
                        <Send className="h-4 w-4 mr-2" />
                        Send Message
                      </>
                    )}
                  </Button>
                </form>
              </CardContent>
            </Card>
          </div>

          {/* Contact Information */}
          <div className="space-y-8">
            <div>
              <h2 className="text-3xl font-bold mb-6 text-white">Get in Touch</h2>
              <p className="text-gray-300 mb-8 text-lg">
                We're here to help and answer any question you might have. We look forward to hearing from you.
              </p>
            </div>

            <div className="grid gap-6">
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <Mail className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-white">Email</h3>
                      <p className="text-gray-300">hello@adhyayan.com</p>
                      <p className="text-gray-300">support@adhyayan.com</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <Phone className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-white">Phone</h3>
                      <p className="text-gray-300">+91 98765 43210</p>
                      <p className="text-gray-300">+91 87654 32109</p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <MapPin className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-white">Address</h3>
                      <p className="text-gray-300">
                        123 Education Street
                        <br />
                        Knowledge District
                        <br />
                        Mumbai, Maharashtra 400001
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardContent className="p-6">
                  <div className="flex items-start space-x-4">
                    <div className="bg-gray-800 p-3 rounded-lg">
                      <Clock className="h-6 w-6 text-white" />
                    </div>
                    <div>
                      <h3 className="font-semibold mb-1 text-white">Business Hours</h3>
                      <p className="text-gray-300">
                        Monday - Friday: 9:00 AM - 6:00 PM
                        <br />
                        Saturday: 10:00 AM - 4:00 PM
                        <br />
                        Sunday: Closed
                      </p>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* FAQ Section */}
            
          </div>
        </div>
      </div>
    </div>
  )
}
