// Select Tenant Page

import React, { useState , useEffect } from 'react';
import { View, Text, Button, TextInput, Touchable, TouchableOpacity } from 'react-native';
import { Link } from "expo-router";
import Logo from '@/components/Logo';
import AuthLayout from '@/components/Layouts/AuthLayout';
import i18n from '@/libs/localize/localize';

import { TenantService } from '@/services/TenantService';
import { Picker } from '@react-native-picker/picker';
import { TenantMemberService } from '@/services/TenantMemberService';
import TenantMember from '@/types/TenantMember';




interface Tenant {
    id: string;
    name: string;
}


const SelectTenanPage = ({ navigation }: any) => {

    const { t } = i18n;

    const [tenantMemberships, setTenantMemberships] = useState<TenantMember[]>([]);
    const [selectedTenantMembership, setSelectedTenantMembership] = useState<TenantMember | null>(null);

    async function getTenantMembershipsByUser() {
        const response = await TenantMemberService.getTenantMembershipsByUser();

        if (!response) {
            return;
        }

        setTenantMemberships(response);
        return response;
    }


    useEffect(() => {

        getTenantMembershipsByUser().then((tenantMemberships) => {
           if (tenantMemberships) {
               setSelectedTenantMembership(tenantMemberships[0]);
               setTenantMemberships(tenantMemberships);
           }
        });

        TenantMemberService.getSelectedTenantMembership().then((selectedTenantMembership) => {
            if (selectedTenantMembership) {
                setSelectedTenantMembership(selectedTenantMembership);
            }
        });

    }, []);


    async function handleTenantMembershipSelection() {
        if (!selectedTenantMembership) {
            return;
        }
        await TenantMemberService.setSelectTenantMembership(selectedTenantMembership);
        navigation.navigate('Home');

    }

    return (
        <AuthLayout subChildren={null} hideSSO={true}>
            <Text className="text-3xl font-bold mb-4">{t('AUTH.SELECT_TENANT')}</Text>
            <Picker
                selectedValue={null}
                onValueChange={(itemValue, itemIndex) => setSelectedTenantMembership(itemValue)}
                className='w-full bg-gray-100 border-2 border-gray-200'
                style={{ }}
            >   

                {tenantMemberships.map((tenantMembership) => {
                    return <Picker.Item key={tenantMembership.tenantMemberId} label={tenantMembership?.tenant?.name} value={tenantMembership.tenantMemberId} />
                }
                )}

            </Picker>
            <TouchableOpacity onPress={handleTenantMembershipSelection} className="w-full">
                <Text className="w-full h-12 bg-blue-500 text-white text-center rounded-lg mt-4 p-2">{t('AUTH.SELECT')}</Text>
            </TouchableOpacity>
        </AuthLayout>
    );
}

export default SelectTenanPage;

    
       