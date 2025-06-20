module adhyayan_payment::subscription {
    use std::error;
    use std::signer;
    use std::vector;
    use aptos_std::table::{Self, Table};
    use aptos_framework::coin;
    use aptos_framework::aptos_coin::AptosCoin;
    use aptos_framework::account;
    use aptos_framework::timestamp;

    /// Payment record already exists
    const EPAYMENT_RECORD_EXISTS: u64 = 1;
    /// Payment record not found
    const EPAYMENT_RECORD_NOT_FOUND: u64 = 2;
    /// Invalid payment amount
    const EINVALID_PAYMENT_AMOUNT: u64 = 3;
    /// Not authorized
    const ENOT_AUTHORIZED: u64 = 4;

    struct SubscriptionConfig has key {
        admin: address,
        payment_receiver: address,
        plans: Table<vector<u8>, Plan>,
    }

    struct Plan has store, drop {
        id: vector<u8>,
        name: vector<u8>,
        price_in_octas: u64,
        duration_in_days: u64,
    }

    struct UserSubscription has key {
        active_subscriptions: Table<vector<u8>, Subscription>,
        payment_history: vector<PaymentRecord>,
    }    struct Subscription has store, drop {
        plan_id: vector<u8>,
        start_time: u64,
        end_time: u64,
        active: bool,
    }

    struct PaymentRecord has store, drop {
        plan_id: vector<u8>,
        amount: u64,
        timestamp: u64,
        transaction_id: vector<u8>,
    }

    /// Initialize the payment module
    public entry fun initialize(admin: &signer, payment_receiver: address) {
        let admin_addr = signer::address_of(admin);
        
        // Create subscription config
        move_to(admin, SubscriptionConfig {
            admin: admin_addr,
            payment_receiver,
            plans: table::new(),
        });
    }

    /// Add a new subscription plan
    public entry fun add_plan(
        admin: &signer,
        id: vector<u8>,
        name: vector<u8>,
        price_in_octas: u64,
        duration_in_days: u64
    ) acquires SubscriptionConfig {
        let admin_addr = signer::address_of(admin);
        
        // Get subscription config
        let subscription_config = borrow_global_mut<SubscriptionConfig>(@adhyayan_payment);
        
        // Check if admin
        assert!(admin_addr == subscription_config.admin, error::permission_denied(ENOT_AUTHORIZED));
        
        // Create and add the plan
        let plan = Plan {
            id,
            name,
            price_in_octas,
            duration_in_days,
        };
        
        table::upsert(&mut subscription_config.plans, id, plan);
    }

    /// Purchase a subscription plan
    public entry fun purchase_subscription(
        buyer: &signer,
        plan_id: vector<u8>,
        transaction_id: vector<u8>
    ) acquires SubscriptionConfig, UserSubscription {
        let buyer_addr = signer::address_of(buyer);
        
        // Get subscription config
        let subscription_config = borrow_global<SubscriptionConfig>(@adhyayan_payment);
        
        // Check if plan exists
        assert!(table::contains(&subscription_config.plans, plan_id), error::not_found(EPAYMENT_RECORD_NOT_FOUND));
        
        // Get plan
        let plan = table::borrow(&subscription_config.plans, plan_id);
        
        // Transfer payment
        coin::transfer<AptosCoin>(buyer, subscription_config.payment_receiver, plan.price_in_octas);
        
        // Initialize user subscription if it doesn't exist
        if (!exists<UserSubscription>(buyer_addr)) {
            move_to(buyer, UserSubscription {
                active_subscriptions: table::new(),
                payment_history: vector::empty(),
            });
        };
        
        // Get user subscription
        let user_subscription = borrow_global_mut<UserSubscription>(buyer_addr);
        
        // Calculate subscription period
        let current_time = timestamp::now_seconds();
        let end_time = current_time + (plan.duration_in_days * 86400);
        
        // Create subscription
        let subscription = Subscription {
            plan_id,
            start_time: current_time,
            end_time,
            active: true,
        };
        
        // Add or update subscription
        table::upsert(&mut user_subscription.active_subscriptions, plan_id, subscription);
        
        // Record payment
        let payment_record = PaymentRecord {
            plan_id,
            amount: plan.price_in_octas,
            timestamp: current_time,
            transaction_id,        };
        
        // Add payment record
        vector::push_back(&mut user_subscription.payment_history, payment_record);
    }

    /// Check if user has an active subscription for a plan
    #[view]
    public fun is_subscription_active(user_addr: address, plan_id: vector<u8>): bool acquires UserSubscription {
        // Check if user has a subscription record
        if (!exists<UserSubscription>(user_addr)) {
            return false
        };
        
        // Get user subscription
        let user_subscription = borrow_global<UserSubscription>(user_addr);
        
        // Check if user has this specific plan
        if (!table::contains(&user_subscription.active_subscriptions, plan_id)) {
            return false
        };
        
        // Get subscription
        let subscription = table::borrow(&user_subscription.active_subscriptions, plan_id);
          // Check if subscription is active and not expired
        let current_time = timestamp::now_seconds();
        
        subscription.active && subscription.end_time > current_time
    }

    /// Get subscription details for a user
    #[view]
    public fun get_subscription_details(
        user_addr: address,
        plan_id: vector<u8>
    ): (u64, u64, bool) acquires UserSubscription {
        // Check if user has a subscription
        assert!(exists<UserSubscription>(user_addr), error::not_found(EPAYMENT_RECORD_NOT_FOUND));
        
        // Get user subscription
        let user_subscription = borrow_global<UserSubscription>(user_addr);
        
        // Check if plan exists
        assert!(table::contains(&user_subscription.active_subscriptions, plan_id), 
            error::not_found(EPAYMENT_RECORD_NOT_FOUND));
        
        // Get subscription
        let subscription = table::borrow(&user_subscription.active_subscriptions, plan_id);
        
        (subscription.start_time, subscription.end_time, subscription.active)
    }
}
