import type { Metadata } from 'next';
import SubscriptionAction from './subscription-action';
export const metadata:Metadata={title:'Your Muzix subscription',robots:{index:false,follow:false},alternates:{canonical:'/subscribe'}};
export default function Page(){return <SubscriptionAction/>;}
