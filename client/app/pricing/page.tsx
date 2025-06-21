'use client';

import React, { useState } from 'react';
import styled from 'styled-components';
import { useRouter } from 'next/navigation';
import { Vortex } from '@/components/ui/vortex';
import { CustomNavbar } from "@/components/custom/CustomNavbar";
import { CustomStickyBanner } from "@/components/custom/CustomStickyBanner";
import { 
  IconCheck, 
  IconCrown, 
  IconBrain,
  IconUsers,
  IconBook,
  IconCurrencyDollar,
  IconCurrencyRupee,
  IconSparkles,
  IconBolt,
  IconRocket,
  IconTrophy
} from '@tabler/icons-react';
import { ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import clsx from 'clsx';

const pricingPlans = [
  {
    name: "Free",
    priceINR: { monthly: 0, annual: 0 },
    priceUSD: { monthly: 0, annual: 0 },
    period: "/forever",
    description: "Your current plan - limited but functional",
    gyanPoints: 50,
    features: [
      "50 Gyan Points per month",
      "~3 Mind Maps only",
      "~10 Personal Quizzes only", 
      "AI Assistant: 10 responses/day limit",
      "Basic mind map templates only",
      "No PDF export",
      "No mobile app access",
      "Community support only"
    ],
    popular: false,
    icon: IconUsers,
    color: "from-gray-400 to-gray-600",
    savings: "Current Plan",
    buttonText: "Current Plan",
    disabled: true
  },
  {
    name: "Student",
    priceINR: { monthly: 499, annual: 4990 },
    priceUSD: { monthly: 6.99, annual: 69.90 },
    period: { monthly: "/month", annual: "/year" },
    description: "Perfect for individual students and casual learners",
    gyanPoints: 300,
    features: [
      "300 Gyan Points per month",
      "~20 Mind Maps (15 points each)",
      "~60 Personal Quizzes (5 points each)", 
      "AI Assistant: 10 free responses/day",
      "Basic mind map templates",
      "PDF export functionality",
      "Mobile app access",
      "Email support"
    ],
    popular: false,
    icon: IconBook,
    color: "from-blue-400 to-blue-600",
    savings: "6x More Points!"
  },
  {
    name: "Scholar",
    priceINR: { monthly: 999, annual: 9990 },
    priceUSD: { monthly: 13.99, annual: 139.90 },
    period: { monthly: "/month", annual: "/year" },
    description: "Ideal for serious learners and small study groups",
    gyanPoints: 750,
    features: [
      "750 Gyan Points per month",
      "~50 Mind Maps with podcasts & theory",
      "~150 Personal Quizzes",
      "AI Assistant: Unlimited responses",
      "Team quiz hosting (set custom stakes)",
      "Advanced mind map features",
      "Priority support",
      "Custom templates & themes",
      "Advanced analytics",
      "Collaboration tools"
    ],
    popular: true,
    icon: IconBrain,
    color: "from-purple-400 to-purple-600",
    savings: "Most Popular"
  },
  {
    name: "Institution",
    priceINR: { monthly: 1999, annual: 19990 },
    priceUSD: { monthly: 24.99, annual: 249.90 },
    period: { monthly: "/month", annual: "/year" },
    description: "For educators, teams, and educational institutions",
    gyanPoints: 2000,
    features: [
      "2,000 Gyan Points per month",
      "~133 Premium Mind Maps",
      "~400 Quizzes & Assessments",
      "Advanced AI Tutoring System",
      "Team management dashboard",
      "Custom quiz tournaments",
      "White-label options",
      "API access for integrations",
      "24/7 priority support",
      "Advanced reporting & analytics",
      "Custom branding",
      "SSO integration"
    ],
    popular: false,
    icon: IconCrown,
    color: "from-orange-400 to-orange-600",
    savings: "Best for Teams"
  }
];

const additionalPacks = [
  {
    name: "Quick Boost",
    points: 100,
    priceINR: 99,
    priceUSD: 1.49,
    description: "Perfect for 6 mind maps or 20 quizzes",
    icon: IconBolt,
    color: "from-green-400 to-green-600",
    value: "Great for weekend study sessions"
  },
  {
    name: "Power Pack", 
    points: 250,
    priceINR: 199,
    priceUSD: 2.99,
    description: "Ideal for 16 mind maps or 50 quizzes",
    icon: IconRocket,
    color: "from-yellow-400 to-yellow-600",
    value: "Most popular top-up"
  },
  {
    name: "Mega Bundle",
    points: 600,
    priceINR: 399,
    priceUSD: 5.99,
    description: "Ultimate value: 40 mind maps or 120 quizzes",
    icon: IconTrophy,
    color: "from-purple-400 to-purple-600",
    value: "Best value per point"
  }
];

const faqs = [
  {
    question: "What are Gyan Points?",
    answer: "Gyan Points are your learning currency on Adhyayan AI. Use them to access AI-powered features, create mind maps, get tutoring assistance, and unlock premium content."
  },
  {
    question: "Can I change my plan anytime?",
    answer: "Yes! You can upgrade or downgrade your plan at any time. Changes will be reflected in your next billing cycle."
  },
  {
    question: "Do unused Gyan Points carry over?",
    answer: "Unused Gyan Points from your monthly subscription expire at the end of each billing cycle. However, purchased top-up points never expire."
  },
  {
    question: "Is there a free trial?",
    answer: "Yes! New users get 100 free Gyan Points to explore our platform. No credit card required."
  },
  {
    question: "What payment methods do you accept?",
    answer: "We accept all major credit cards, debit cards, UPI, net banking, and digital wallets popular in India."
  }
];

const StyledWrapper = styled.div`
  .card-container {
    width: 280px;
    background: linear-gradient(to top right, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff);
    padding: 4px;
    border-radius: 24px;
    display: flex;
    flex-direction: column;
    transition: transform 0.3s ease-in-out;
  }
  .card-container:hover {
    transform: scale(1.05);
  }
  .card-container.popular {
    box-shadow: 0 0 20px rgba(151, 90, 244, 0.5);
  }
  .card-container .title-card {
    display: flex;
    align-items: center;
    padding: 12px 16px;
    justify-content: space-between;
    color: #fff;
  }
  .card-container .title-card p {
    font-size: 12px;
    font-weight: 600;
    font-style: italic;
    text-shadow: 1px 1px 4px #2975ee;
  }
  .card-container .card-content {
    background-color: #1a1e24;
    border-radius: 22px;
    color: #bab9b9;
    font-size: 14px;
    padding: 16px;
    display: flex;
    flex-direction: column;
    gap: 12px;
  }
  .card-container .card-content .title {
    font-weight: 600;
    color: #ffffff;
    font-size: 20px;
  }
  .card-container .card-content .plain {
    display: flex;
    align-items: baseline;
    gap: 4px;
  }
  .card-container .card-content .plain span:nth-child(1) {
    font-size: 28px;
    color: #fff;
    font-weight: 700;
  }
  .card-container .card-content .plain span:nth-child(2) {
    font-size: 12px;
    color: #838383;
  }
  .card-container .card-content .description {
    font-size: 12px;
    color: #838383;
    text-align: center;
  }
  .card-container .card-content .card-btn {
    background: linear-gradient(4deg, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff);
    padding: 8px;
    border: none;
    width: 100%;
    border-radius: 8px;
    color: rgba(255, 255, 255, 0.8);
    font-size: 14px;
    font-weight: 600;
    transition: all 0.3s ease-in-out;
    cursor: pointer;
    box-shadow: inset 0 2px 4px rgba(255, 255, 255, 0.3);
  }
  .card-container .card-content .card-btn:hover {
    color: #ffffff;
    text-shadow: 0 0 8px #fff;
    transform: scale(1.03);
  }
  .card-container .card-content .card-btn:disabled {
    background: #4a4a4a;
    color: #838383;
    cursor: not-allowed;
  }
  .card-container .card-content .card-separate {
    display: flex;
    gap: 8px;
    align-items: center;
    width: 100%;
    font-size: 10px;
    color: rgba(131, 131, 131, 0.5);
  }
  .card-container .card-content .card-separate .separate {
    width: 100%;
    height: 1px;
    background-color: rgba(131, 131, 131, 0.5);
  }
  .card-container .card-content .card-list-features {
    display: flex;
    flex-direction: column;
    gap: 8px;
  }
  .card-container .card-content .card-list-features .option {
    display: flex;
    gap: 8px;
    align-items: center;
    font-size: 12px;
    color: #bab9b9;
  }

  .tab-container {
    display: flex;
    flex-direction: row;
    align-items: flex-start;
    position: relative;
    padding: 2px;
    background-color: #2a2e34;
    border-radius: 9px;
    margin: 10px 20px 0px 20px;
  }
  .tab {
    width: 50%;
    height: 28px;
    position: relative;
    z-index: 99;
    background-color: transparent;
    border: 0;
    outline: none;
    flex: none;
    align-self: stretch;
    flex-grow: 1;
    cursor: pointer;
    font-weight: 500;
    color: #bab9b9;
    font-size: 14px;
  }
  .tab.active {
    color: #ffffff;
  }
  .indicator {
    width: 50%;
    height: 28px;
    background: #ffffff;
    position: absolute;
    top: 2px;
    left: 2px;
    z-index: 9;
    border: 0.5px solid rgba(0, 0, 0, 0.04);
    box-shadow: 0px 3px 8px rgba(0, 0, 0, 0.12), 0px 3px 1px rgba(0, 0, 0, 0.04);
    border-radius: 7px;
    transition: all 0.2s ease-out;
  }
  .tab--monthly:hover ~ .indicator,
  .tab--monthly.active ~ .indicator {
    left: 2px;
  }
  .tab--annual:hover ~ .indicator,
  .tab--annual.active ~ .indicator {
    left: calc(50% - 2px);
  }

  .faq-container {
    background: #1a1e24;
    border-radius: 16px;
    padding: 16px;
    cursor: pointer;
    transition: all 0.3s ease-in-out;
  }
  .faq-container:hover {
    background: #22262c;
  }
  .faq-container .faq-header {
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  .faq-container .faq-header h3 {
    font-size: 16px;
    font-weight: 600;
    color: #ffffff;
  }
  .faq-container .faq-content {
    margin-top: 12px;
    font-size: 14px;
    color: #bab9b9;
  }

  .cta-button {
    background: linear-gradient(4deg, #975af4, #2f7cf8 40%, #78aafa 65%, #934cff);
    padding: 12px 24px;
    border: none;
    border-radius: 8px;
    color: #ffffff;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s ease-in-out;
    display: inline-flex;
    align-items: center;
    gap: 8px;
  }
  .cta-button:hover {
    transform: scale(1.05);
    box-shadow: 0 0 12px rgba(151, 90, 244, 0.5);
  }

  .currency-toggle {
    background: #2a2e34;
    border-radius: 999px;
    padding: 2px;
  }
  .currency-button {
    padding: 8px 16px;
    border-radius: 999px;
    font-size: 14px;
    transition: all 0.3s ease-in-out;
  }
  .currency-button.active {
    background: #ffffff;
    color: #1a1e24;
  }
`;

export default function PricingPage() {
  const [currency, setCurrency] = useState<'INR' | 'USD'>('INR');
  const [billingCycle, setBillingCycle] = useState<'monthly' | 'annual'>('monthly');
  const [openFAQ, setOpenFAQ] = useState<Set<number>>(new Set());
  const router = useRouter();

  const toggleFAQ = (index: number) => {
    const newOpen = new Set(openFAQ);
    if (newOpen.has(index)) {
      newOpen.delete(index);
    } else {
      newOpen.add(index);
    }
    setOpenFAQ(newOpen);
  };

  const formatPrice = (priceINR: { monthly: number; annual: number }, priceUSD: { monthly: number; annual: number }) => {
    const price = currency === 'INR' ? priceINR[billingCycle] : priceUSD[billingCycle];
    return price === 0 ? 'Free' : `${currency === 'INR' ? '₹' : '$'}${price}`;
  };
  const handlePlanSelect = (planName: string) => {
    if (planName === "Free") return;
    
    const selectedPlan = pricingPlans.find(plan => plan.name === planName);
    if (!selectedPlan) return;
    
    // Create URL search params with plan data
    const planData = {
      name: selectedPlan.name,
      priceINR: selectedPlan.priceINR,
      priceUSD: selectedPlan.priceUSD,
      period: selectedPlan.period,
      description: selectedPlan.description,
      gyanPoints: selectedPlan.gyanPoints,
      features: selectedPlan.features,
      currency: currency,
      billingCycle: billingCycle,
      type: 'subscription'
    };
    
    const searchParams = new URLSearchParams({
      data: JSON.stringify(planData)
    });
    
    router.push(`/confirm?${searchParams.toString()}`);
  };

  const handleTopUpPurchase = (packName: string, price: number) => {
    const selectedPack = additionalPacks.find(pack => pack.name === packName);
    if (!selectedPack) return;
    
    const packData = {
      name: selectedPack.name,
      points: selectedPack.points,
      priceINR: selectedPack.priceINR,
      priceUSD: selectedPack.priceUSD,
      description: selectedPack.description,
      currency: currency,
      type: 'topup'
    };
    
    const searchParams = new URLSearchParams({
      data: JSON.stringify(packData)
    });
    
    router.push(`/confirm?${searchParams.toString()}`);
  };
  return (
    <StyledWrapper>
      <div className="min-h-screen bg-black text-white">
        <div className="relative z-50">
          <CustomStickyBanner />
          <CustomNavbar />
        </div>
        {/* Hero Section */}
        <div className="relative h-[32rem] overflow-hidden">
          <Vortex
            backgroundColor="black"
            className="flex items-center flex-col justify-center px-4 py-4 w-full h-full"
          >
            <div className="text-center max-w-4xl mx-auto z-10">
              <h1 className="text-4xl md:text-6xl font-bold mb-6">
                Choose Your
                <span className="bg-gradient-to-r from-purple-400 to-pink-400 bg-clip-text text-transparent">
                  {" "}Learning Path
                </span>
              </h1>
              <p className="text-white/80 text-lg md:text-xl max-w-2xl mx-auto leading-relaxed">
                Unlock your potential with AI-powered learning. Select the perfect plan to fuel your educational journey.
              </p>
              <div className="flex flex-col sm:flex-row items-center gap-4 mt-8 justify-center">
                <button className="cta-button">
                  <IconSparkles className="h-5 w-5" />
                  Start Free Trial
                </button>
                <button className="px-6 py-3 text-white/80 hover:text-white transition-colors">
                  View Demo
                </button>
              </div>
              {/* Currency Toggle */}
              <div className="currency-toggle flex items-center justify-center gap-2 mt-8">
                <button
                  onClick={() => setCurrency('INR')}
                  className={clsx("currency-button", { active: currency === 'INR' })}
                >
                  <IconCurrencyRupee className="h-4 w-4 inline-block mr-1" />
                  INR
                </button>
                <button
                  onClick={() => setCurrency('USD')}
                  className={clsx("currency-button", { active: currency === 'USD' })}
                >
                  <IconCurrencyDollar className="h-4 w-4 inline-block mr-1" />
                  USD
                </button>
              </div>
            </div>
          </Vortex>
        </div>

        {/* Pricing Plans */}
        <div className="container mx-auto px-4 py-16">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Subscription Plans
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Choose a plan that fits your learning needs. All plans include access to our AI-powered features.
            </p>
            <div className="tab-container mx-auto max-w-xs mt-6">
              <button
                className={clsx("tab tab--monthly", { active: billingCycle === 'monthly' })}
                onClick={() => setBillingCycle('monthly')}
              >
                Monthly
              </button>
              <button
                className={clsx("tab tab--annual", { active: billingCycle === 'annual' })}
                onClick={() => setBillingCycle('annual')}
              >
                Annual
              </button>
              <div className="indicator" />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-6 max-w-7xl mx-auto">
            {pricingPlans.map((plan, index) => {
              const IconComponent = plan.icon;
              return (
                <div
                  key={index}
                  className={clsx("card-container", { popular: plan.popular })}
                >
                  {plan.popular && (
                    <div className="title-card">
                      <p>MOST POPULAR</p>
                      <svg xmlns="http://www.w3.org/2000/svg" width={16} height={16} viewBox="0 0 24 24">
                        <path fill="currentColor" d="M10.277 16.515c.005-.11.187-.154.24-.058c.254.45.686 1.111 1.177 1.412c.49.3 1.275.386 1.791.408c.11.005.154.186.058.24c-.45.254-1.111.686-1.412 1.176s-.386 1.276-.408 1.792c-.005.11-.187.153-.24.057c-.254-.45-.686-1.11-1.176-1.411s-1.276-.386-1.792-.408c-.11-.005-.153-.187-.057-.24c.45-.254 1.11-.686 1.411-1.177c.301-.49.386-1.276.408-1.791m8.215-1c-.008-.11-.2-.156-.257-.062c-.172.283-.421.623-.697.793s-.693.236-1.023.262c-.11.008-.155.2-.062.257c.283.172.624.42.793.697s.237.693.262 1.023c.009.11.2.155.258.061c.172-.282.42-.623.697-.792s.692-.237 1.022-.262c.11-.009.156-.2.062-.258c-.283-.172-.624-.42-.793-.697s-.236-.692-.262-1.022M14.704 4.002l-.242-.306c-.937-1.183-1.405-1.775-1.95-1.688c-.545.088-.806.796-1.327 2.213l-.134.366c-.149.403-.223.604-.364.752c-.143.148-.336.225-.724.38l-.353.141l-.248.1c-1.2.48-1.804.753-1.881 1.283c-.082.565.49 1.049 1.634 2.016l.296.25c.325.275.488.413.58.6c.094.187.107.403.134.835l.024.393c.093 1.52.14 2.28.634 2.542s1.108-.147 2.336-.966l.318-.212c.35-.233.524-.35.723-.381c.2-.032.402.024.806.136l.368.102c1.422.394 2.133.591 2.52.188c.388-.403.196-1.14-.19-2.613l-.099-.381c-.11-.419-.164-.628-.134-.835s.142-.389.365-.752l.203-.33c.786-1.276 1.179-1.914.924-2.426c-.254-.51-.987-.557-2.454-.648l-.379-.024c-.417-.026-.625-.039-.806-.135c-.18-.096-.314-.264-.58-.6m-5.869 9.324C6.698 14.37 4.919 16.024 4.248 18c-.752-4.707.292-7.747 1.965-9.637c.144.295.332.539.5.73c.35.396.852.82 1.362 1.251l.367.31l.17.145c.005.064.01.14.015.237l.03.485c.04.655.08 1.294.178 1.805" />
                      </svg>
                    </div>
                  )}
                  <div className="card-content">
                    <p className="title">{plan.name}</p>
                    <div className="plain">                      
                        <span>{formatPrice(plan.priceINR, plan.priceUSD)}</span>
                      <span>{typeof plan.period === 'string' ? plan.period : plan.period[billingCycle]}</span>
                    </div>
                    <p className="description">{plan.description}</p>
                    <button
                      className="card-btn"
                      disabled={plan.disabled}
                      onClick={() => handlePlanSelect(plan.name)}
                    >
                      {plan.buttonText || (plan.popular ? 'Get Started - Most Popular' : 'Get Started')}
                    </button>
                    <div className="card-separate">
                      <div className="separate" />
                      <p>FEATURES</p>
                      <div className="separate" />
                    </div>
                    <div className="card-list-features">
                      {plan.features.map((feature, featureIndex) => (
                        <div key={featureIndex} className="option">
                          <svg viewBox="0 0 24 24" height={14} width={14} xmlns="http://www.w3.org/2000/svg">
                            <g strokeWidth={2} strokeLinejoin="round" strokeLinecap="round" stroke="currentColor" fill="none">
                              <rect rx={4} y={3} x={3} height={18} width={18} />
                              <path d="m9 12l2.25 2L15 10" />
                            </g>
                          </svg>
                          <p>{feature}</p>
                        </div>
                      ))}
                    </div>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${plan.color} text-white text-sm font-medium mt-4`}>
                      <IconSparkles className="h-4 w-4" />
                      <span>{plan.gyanPoints} Gyan Points</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Additional Gyan Points Packs */}
        <div className="container mx-auto px-4 py-16 border-t border-white/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Top-up Your
              <span className="bg-gradient-to-r from-yellow-400 to-orange-400 bg-clip-text text-transparent">
                {" "}Gyan Points
              </span>
            </h2>
            <p className="text-white/60 text-lg max-w-2xl mx-auto">
              Need more points? Purchase additional Gyan Points to supercharge your learning experience.
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-5xl mx-auto">
            {additionalPacks.map((pack, index) => {
              const IconComponent = pack.icon;
              return (
                <div key={index} className="card-container">
                  <div className="card-content">
                    <div className={`inline-flex p-3 rounded-xl bg-gradient-to-r ${pack.color} mb-4`}>
                      <IconComponent className="h-6 w-6 text-white" />
                    </div>
                    <p className="title">{pack.name}</p>
                    <p className="description">{pack.description}</p>
                    <div className="text-xs text-green-400 font-medium mb-4">{pack.value}</div>
                    <div className="plain">
                      <span>{formatPrice({ monthly: pack.priceINR, annual: pack.priceINR }, { monthly: pack.priceUSD, annual: pack.priceUSD })}</span>
                    </div>
                    <button
                      className="card-btn"
                      onClick={() => handleTopUpPurchase(pack.name, currency === 'INR' ? pack.priceINR : pack.priceUSD)}
                    >
                      Purchase Now
                    </button>
                    <div className={`inline-flex items-center gap-2 px-3 py-1 rounded-full bg-gradient-to-r ${pack.color} text-white text-sm font-medium mt-4`}>
                      <IconSparkles className="h-4 w-4" />
                      <span>{pack.points} Points</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* FAQ Section */}
        <div className="container mx-auto px-4 py-16 border-t border-white/10">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-5xl font-bold mb-4">
              Frequently Asked Questions
            </h2>
          </div>

          <div className="max-w-3xl mx-auto space-y-4">
            {faqs.map((faq, index) => (
              <div key={index} className="faq-container" onClick={() => toggleFAQ(index)}>
                <div className="faq-header">
                  <h3>{faq.question}</h3>
                  {openFAQ.has(index) ? (
                    <ChevronUpIcon className="h-5 w-5 text-white/60" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-white/60" />
                  )}
                </div>
                {openFAQ.has(index) && (
                  <div className="faq-content">
                    <p>{faq.answer}</p>
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>

        {/* CTA Section */}
        <div className="container mx-auto px-4 py-16 text-center">
          <h2 className="text-3xl md:text-5xl font-bold mb-6">
            Ready to Transform Your Learning?
          </h2>
          <p className="text-white/60 text-lg mb-8 max-w-2xl mx-auto">
            Join thousands of students and professionals who are already using Adhyayan AI to accelerate their learning journey.
          </p>
          <button className="cta-button">
            <IconRocket className="h-6 w-6" />
            Start Your Journey Today
          </button>
        </div>
      </div>
    </StyledWrapper>
  );
}